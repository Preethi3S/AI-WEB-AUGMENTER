// content.js
// This script is injected into web pages to handle UI interactions and content extraction.
// UPDATED: Added UI and logic for the productivity feature (purpose prompt).


(() => {
    // Prevent the content script from running multiple times on the same page.
    if (window.aiAugmenterContentScriptInitialized) {
        console.log("Content script: Already initialized. Skipping re-initialization.");
        return;
    }
    window.aiAugmenterContentScriptInitialized = true;
    console.log("Content script: Initializing for the first time on this page.");

    // Store the current tab ID, which will be received from messages from background.js.
    let _currentTabId = null;

    // CSS for the reader mode feature.
    const readerModeCss = `
        .ai-augmenter-reader-mode {
            font-family: 'Georgia', serif !important;
            line-height: 1.6 !important;
            max-width: 700px !important;
            margin: 0 auto !important;
            padding: 20px !important;
            background-color: #fbfbfb !important;
            color: #333 !important;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border-radius: 8px;
        }
        .ai-augmenter-reader-mode p,
        .ai-augmenter-reader-mode h1,
        .ai-augmenter-reader-mode h2,
        .ai-augmenter-reader-mode h3,
        .ai-augmenter-reader-mode li {
            font-size: 1.15em !important;
            line-height: 1.7 !important;
            margin-bottom: 1em !important;
        }
        .ai-augmenter-reader-mode img {
            max-width: 100% !important;
            height: auto !important;
            display: block !important;
            margin: 1.5em auto !important;
            border-radius: 5px;
        }
        /* Basic reset to remove some common page elements for a cleaner view */
        .ai-augmenter-reader-mode header,
        .ai-augmenter-reader-mode nav,
        .ai-augmenter-reader-mode footer,
        .ai-augmenter-reader-mode aside,
        .ai-augmenter-reader-mode .sidebar,
        .ai-augmenter-reader-mode .ads,
        .ai-augmenter-reader-mode .related-articles {
            display: none !important;
        }
    `;

    // Toggles reader mode by injecting/removing CSS and applying/removing a class to the body.
    function toggleReaderMode() {
        let styleElement = document.getElementById('ai-augmenter-reader-style');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'ai-augmenter-reader-style';
            styleElement.textContent = readerModeCss;
            document.head.appendChild(styleElement);
            document.body.classList.add('ai-augmenter-reader-mode');
            console.log("Content script: Reader Mode activated.");
            chrome.runtime.sendMessage({ action: "readerModeStatus", status: "Reader Mode activated." });
        } else {
            styleElement.remove();
            document.body.classList.remove('ai-augmenter-reader-mode');
            console.log("Content script: Reader Mode deactivated.");
            chrome.runtime.sendMessage({ action: "readerModeStatus", status: "Reader Mode deactivated." });
        }
    }

    // Extracts the main textual content from the current web page.
    function extractMainContent() {
        console.log("Content script: Starting extractMainContent()...");
        // Prioritized list of selectors to find the main content area.
        const mainContentSelectors = [
            'article',
            'main',
            'div[role="main"]', // ARIA role for main content
            '#bodyContent', // Wikipedia specific
            '#mw-content-text', // Wikipedia specific
            '.wiki-content', // Generic for wiki-like sites
            '.article-content', // Common article content class
            '#content',
            '#page-content',
            '.content',
            '.page-content',
            '.post-content',
            '.entry-content',
            '.article-body',
            'div[id*="content"]', // Generic content divs
            'div[class*="content"]',
            'div[id*="main"]',    // Generic main divs
            'div[class*="main"]'
        ];

        let mainContentElement = null;
        let contentText = null;

        for (const selector of mainContentSelectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.innerText ? element.innerText.trim() : '';
                    const textLength = text.length;
                    console.log(`Content script: Checking selector '${selector}'. Found element, text length: ${textLength}`);

                    if (textLength > 200) { // Standard threshold for specific content elements
                        mainContentElement = element;
                        contentText = text;
                        console.log(`Content script: extractMainContent: Selected element with selector '${selector}'.`);
                        break;
                    }
                } else {
                    console.log(`Content script: Selector '${selector}' not found.`);
                }
            } catch (e) {
                console.error(`Content script: Error querying selector '${selector}':`, e);
            }
        }

        // Fallback to body.textContent if no specific content element is found with enough text
        if (!contentText || contentText.length <= 200) {
            const bodyText = document.body.innerText ? document.body.innerText.trim() : '';
            if (bodyText.length > 50) { // Lower threshold for body as a last resort
                contentText = bodyText;
                console.log(`Content script: extractMainContent: Falling back to body text. Length: ${contentText.length}`);
            } else {
                console.warn("Content script: extractMainContent: Body text also too short. Returning null.");
                return null;
            }
        }

        if (contentText) {
            // Clean up multiple newlines and excessive whitespace for cleaner AI input.
            contentText = contentText.replace(/\n\s*\n/g, '\n\n').replace(/\s+/g, ' ').trim();
            console.log(`Content script: extractMainContent: Successfully extracted content. Final length: ${contentText.length}`);
            return contentText;
        }

        console.warn("Content script: extractMainContent: Could not find a suitable main content element with enough text. Returning null.");
        return null;
    }

    // Copies provided text to the clipboard and gives visual feedback on the button.
    function copyToClipboard(text, buttonElement) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed'; // Position off-screen
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select(); // Select the text
            document.execCommand('copy'); // Execute copy command
            document.body.removeChild(textarea); // Remove the temporary textarea

            // Provide visual feedback to the user.
            const originalText = buttonElement.textContent;
            buttonElement.textContent = 'Copied!';
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 1500);

            console.log("Content script: Text copied to clipboard.");
        } catch (err) {
            console.error('Content script: Failed to copy text:', err);
            showTemporaryMessage('Failed to copy text to clipboard.', 'error');
        }
    }

    // Opens a new tab with a Google search for the given query.
    function performWebSearch(query) {
        if (query) {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            window.open(searchUrl, '_blank');
            console.log(`Content script: Performing web search for: "${query}"`);
        }
    }

    // Displays a temporary message box at the bottom center of the screen.
    function showTemporaryMessage(message, type = 'info') {
        let msgBox = document.getElementById('ai-augmenter-temp-message');
        if (!msgBox) {
            msgBox = document.createElement('div');
            msgBox.id = 'ai-augmenter-temp-message';
            // Inject CSS for the message box.
            const msgStyle = document.createElement('style');
            msgStyle.textContent = `
                #ai-augmenter-temp-message {
                    position: fixed !important;
                    bottom: 1rem !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    background-color: #333 !important;
                    color: white !important;
                    padding: 0.75rem 1.5rem !important;
                    border-radius: 0.5rem !important;
                    font-size: 0.9rem !important;
                    z-index: 2147483647 !important; /* Highest possible z-index */
                    opacity: 0;
                    transition: opacity 0.3s ease-in-out !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
                }
                #ai-augmenter-temp-message.show {
                    opacity: 1;
                }
                #ai-augmenter-temp-message.error {
                    background-color: #dc2626 !important; /* Red for errors */
                }
                #ai-augmenter-temp-message.success {
                    background-color: #16a34a !important; /* Green for success */
                }
            `;
            document.head.appendChild(msgStyle);
            document.body.appendChild(msgBox);
        }

        msgBox.textContent = message;
        msgBox.className = `show ${type}`; // Apply show and type classes
        // Hide the message after 3 seconds.
        setTimeout(() => {
            msgBox.classList.remove('show');
        }, 3000);
    }

    // Displays a simple explanation in an overlay.
    function displaySimpleExplanation(explanationText) {
        let existingExplanationBox = document.getElementById('ai-augmenter-explanation-box');
        if (existingExplanationBox) {
            existingExplanationBox.remove(); // Remove any existing box first.
        }

        const explanationBox = document.createElement('div');
        explanationBox.id = 'ai-augmenter-explanation-box';
        explanationBox.className = `
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-6 rounded-lg shadow-xl
            max-w-md w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const explanationBoxStyle = document.createElement('style');
        explanationBoxStyle.textContent = `
            #ai-augmenter-explanation-box {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
                width: 90% !important;
                max-width: 450px !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1.5rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                font-size: 1rem !important;
                line-height: 1.6 !important;
                opacity: 0;
                transform: translate(-50%, -60%); /* Start slightly higher for animation */
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
            }
            #ai-augmenter-explanation-box.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
            #ai-augmenter-explanation-box h3 {
                font-weight: bold !important;
                margin-bottom: 0.75rem !important;
                color: #1f2937 !important;
                font-size: 1.1rem !important;
            }
            #ai-augmenter-explanation-box p {
                margin-bottom: 1rem !important;
                flex-grow: 1 !important; /* Allow content to take available space */
                overflow-y: auto; /* Make content scrollable if too long */
            }
            #ai-augmenter-explanation-box button.close-btn-exp {
                background: none !important;
                border: none !important;
                font-size: 1.5rem !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                color: #6b7280 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
            }
            #ai-augmenter-explanation-box button.close-btn-exp:hover {
                color: #1f2937 !important;
            }
        `;
        document.head.appendChild(explanationBoxStyle);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close explanation';
        closeButton.className = 'close-btn-exp';
        closeButton.addEventListener('click', () => {
            explanationBox.classList.remove('show');
            setTimeout(() => explanationBoxStyle.remove(), 300);
            setTimeout(() => explanationBox.remove(), 300);
        });
        explanationBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'Simplified Explanation:';
        explanationBox.appendChild(heading);

        const contentParagraph = document.createElement('p');
        contentParagraph.textContent = explanationText;
        explanationBox.appendChild(contentParagraph);

        document.body.appendChild(explanationBox);

        // Animate the box into view.
        setTimeout(() => {
            explanationBox.classList.add('show');
        }, 10);

        console.log("Content script: Simple explanation box displayed on page.");
    }

    // Displays a shopping list in an overlay.
    function displayShoppingList(ingredients, error = null) {
        let existingListBox = document.getElementById('ai-augmenter-shopping-list-box');
        if (existingListBox) {
            existingListBox.remove();
        }

        const listBox = document.createElement('div');
        listBox.id = 'ai-augmenter-shopping-list-box';
        listBox.className = `
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-6 rounded-lg shadow-xl
            max-w-md w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const listStyle = document.createElement('style');
        listStyle.textContent = `
            #ai-augmenter-shopping-list-box {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
                width: 90% !important;
                max-width: 450px !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1.5rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                font-size: 1rem !important;
                line-height: 1.6 !important;
                opacity: 0;
                transform: translate(-50%, -60%); /* Start slightly higher for animation */
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
            }
            #ai-augmenter-shopping-list-box.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
            #ai-augmenter-shopping-list-box h3 {
                font-weight: bold !important;
                margin-bottom: 0.75rem !important;
                color: #1f2937 !important;
                font-size: 1.1rem !important;
            }
            #ai-augmenter-shopping-list-box ul {
                list-style: disc !important;
                margin-left: 1.5rem !important;
                margin-bottom: 1rem !important;
                flex-grow: 1 !important;
                overflow-y: auto;
            }
            #ai-augmenter-shopping-list-box li {
                margin-bottom: 0.5rem !important;
            }
            #ai-augmenter-shopping-list-box button.close-btn-list {
                background: none !important;
                border: none !important;
                font-size: 1.5rem !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                color: #6b7280 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
            }
            #ai-augmenter-shopping-list-box button.close-btn-list:hover {
                color: #1f2937 !important;
            }
            #ai-augmenter-shopping-list-box .copy-all-btn {
                display: block !important;
                width: 100% !important;
                padding: 0.5rem 1rem !important;
                background-color: #3b82f6 !important; /* blue-500 */
                color: white !important;
                border: none !important;
                border-radius: 0.5rem !important;
                font-size: 0.9rem !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease-in-out !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                margin-top: 1rem !important;
            }
            #ai-augmenter-shopping-list-box .copy-all-btn:hover {
                background-color: #2563eb !important;
            }
            #ai-augmenter-shopping-list-box .error-message {
                color: #dc2626 !important;
                font-weight: bold !important;
                margin-bottom: 1rem !important;
            }
        `;
        document.head.appendChild(listStyle);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close list';
        closeButton.className = 'close-btn-list';
        closeButton.addEventListener('click', () => {
            listBox.classList.remove('show');
            setTimeout(() => listStyle.remove(), 300);
            setTimeout(() => listBox.remove(), 300);
        });
        listBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'Shopping List:';
        listBox.appendChild(heading);

        if (error) {
            const errorMessage = document.createElement('p');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Error: ${error}`;
            listBox.appendChild(errorMessage);
        } else if (ingredients && ingredients.length > 0) {
            const ul = document.createElement('ul');
            ingredients.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                ul.appendChild(li);
            });
            listBox.appendChild(ul);

            const copyAllButton = document.createElement('button');
            copyAllButton.textContent = 'Copy All Ingredients';
            copyAllButton.className = 'copy-all-btn';
            copyAllButton.addEventListener('click', () => {
                const allIngredientsText = ingredients.join('\n');
                copyToClipboard(allIngredientsText, copyAllButton);
                showTemporaryMessage('All ingredients copied!', 'success');
            });
            listBox.appendChild(copyAllButton);
        } else {
            const noItemsMessage = document.createElement('p');
            noItemsMessage.textContent = "No ingredients found or generated.";
            listBox.appendChild(noItemsMessage);
        }

        document.body.appendChild(listBox);

        setTimeout(() => {
            listBox.classList.add('show');
        }, 10);

        console.log("Content script: Shopping list box displayed on page.");
    }

    // Displays a translated summary in an overlay.
    function displayTranslatedSummary(translatedText, error = null) {
        let existingTranslatedBox = document.getElementById('ai-augmenter-translated-summary-box');
        if (existingTranslatedBox) {
            existingTranslatedBox.remove();
        }

        const translatedBox = document.createElement('div');
        translatedBox.id = 'ai-augmenter-translated-summary-box';
        translatedBox.className = `
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-6 rounded-lg shadow-xl
            max-w-md w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const translatedStyle = document.createElement('style');
        translatedStyle.textContent = `
            #ai-augmenter-translated-summary-box {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
                width: 90% !important;
                max-width: 450px !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1.5rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                font-size: 1rem !important;
                line-height: 1.6 !important;
                opacity: 0;
                transform: translate(-50%, -60%); /* Start slightly higher for animation */
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
            }
            #ai-augmenter-translated-summary-box.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
            #ai-augmenter-translated-summary-box h3 {
                font-weight: bold !important;
                margin-bottom: 0.75rem !important;
                color: #1f2937 !important;
                font-size: 1.1rem !important;
            }
            #ai-augmenter-translated-summary-box p {
                margin-bottom: 1rem !important;
                flex-grow: 1 !important; /* Allow content to take available space */
                overflow-y: auto; /* Make content scrollable if too long */
            }
            #ai-augmenter-translated-summary-box button.close-btn-trans {
                background: none !important;
                border: none !important;
                font-size: 1.5rem !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                color: #6b7280 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
            }
            #ai-augmenter-translated-summary-box button.close-btn-trans:hover {
                color: #1f2937 !important;
            }
        `;
        document.head.appendChild(translatedStyle);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close translation';
        closeButton.className = 'close-btn-trans';
        closeButton.addEventListener('click', () => {
            translatedBox.classList.remove('show');
            setTimeout(() => translatedStyle.remove(), 300);
            setTimeout(() => translatedBox.remove(), 300);
        });
        translatedBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'Translated Summary:';
        translatedBox.appendChild(heading);

        if (error) {
            const errorMessage = document.createElement('p');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Error: ${error}`;
            translatedBox.appendChild(errorMessage);
        } else {
            const contentParagraph = document.createElement('p');
            contentParagraph.textContent = translatedText;
            translatedBox.appendChild(contentParagraph);
        }

        document.body.appendChild(translatedBox);

        setTimeout(() => {
            translatedBox.classList.add('show');
        }, 10);

        console.log("Content script: Translated summary box displayed on page.");
    }

    // Displays calendar event details and provides an "Add to Calendar" button.
    function displayCalendarEvent(eventData, error = null) {
        let existingEventBox = document.getElementById('ai-augmenter-calendar-event-box');
        if (existingEventBox) {
            existingEventBox.remove();
        }

        const eventBox = document.createElement('div');
        eventBox.id = 'ai-augmenter-calendar-event-box';
        eventBox.className = `
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-6 rounded-lg shadow-xl
            max-w-md w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const eventStyle = document.createElement('style');
        eventStyle.textContent = `
            #ai-augmenter-calendar-event-box {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
                width: 90% !important;
                max-width: 450px !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1.5rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                font-size: 1rem !important;
                line-height: 1.6 !important;
                opacity: 0;
                transform: translate(-50%, -60%); /* Start slightly higher for animation */
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
            }
            #ai-augmenter-calendar-event-box.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
            #ai-augmenter-calendar-event-box h3 {
                font-weight: bold !important;
                margin-bottom: 0.75rem !important;
                color: #1f2937 !important;
                font-size: 1.1rem !important;
            }
            #ai-augmenter-calendar-event-box p {
                margin-bottom: 0.5rem !important;
            }
            #ai-augmenter-calendar-event-box strong {
                font-weight: 600 !important;
            }
            #ai-augmenter-calendar-event-box button.close-btn-event {
                background: none !important;
                border: none !important;
                font-size: 1.5rem !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                color: #6b7280 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
            }
            #ai-augmenter-calendar-event-box button.close-btn-event:hover {
                color: #1f2937 !important;
            }
            #ai-augmenter-calendar-event-box .add-to-calendar-btn {
                display: block !important;
                width: 100% !important;
                padding: 0.5rem 1rem !important;
                background-color: #3b82f6 !important; /* blue-500 */
                color: white !important;
                border: none !important;
                border-radius: 0.5rem !important;
                font-size: 0.9rem !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease-in-out !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                margin-top: 1rem !important;
            }
            #ai-augmenter-calendar-event-box .add-to-calendar-btn:hover {
                background-color: #2563eb !important;
            }
            #ai-augmenter-calendar-event-box .error-message {
                color: #dc2626 !important;
                font-weight: bold !important;
                margin-bottom: 1rem !important;
            }
        `;
        document.head.appendChild(eventStyle);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close event details';
        closeButton.className = 'close-btn-event';
        closeButton.addEventListener('click', () => {
            eventBox.classList.remove('show');
            setTimeout(() => eventStyle.remove(), 300);
            setTimeout(() => eventBox.remove(), 300);
        });
        eventBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'Event Details:';
        eventBox.appendChild(heading);

        if (error) {
            const errorMessage = document.createElement('p');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Error: ${error}`;
            eventBox.appendChild(errorMessage);
        } else if (eventData && eventData.title) {
            const detailsDiv = document.createElement('div');
            detailsDiv.innerHTML = `
                <p><strong>Title:</strong> ${eventData.title || 'N/A'}</p>
                <p><strong>Time:</strong> ${eventData.startTime ? new Date(eventData.startTime).toLocaleString() : 'N/A'} ${eventData.endTime ? `- ${new Date(eventData.endTime).toLocaleString()}` : ''}</p>
                <p><strong>Location:</strong> ${eventData.location || 'N/A'}</p>
                <p><strong>Description:</strong> ${eventData.description || 'N/A'}</p>
            `;
            eventBox.appendChild(detailsDiv);

            const addToCalendarButton = document.createElement('button');
            addToCalendarButton.textContent = 'Add to Google Calendar';
            addToCalendarButton.className = 'add-to-calendar-btn';
            addToCalendarButton.addEventListener('click', () => {
                // Construct Google Calendar URL for adding an event.
                const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title)}&dates=${eventData.startTime.replace(/[-:]|\.\d{3}/g, "")}/${eventData.endTime.replace(/[-:]|\.\d{3}/g, "")}&details=${encodeURIComponent(eventData.description)}&location=${encodeURIComponent(eventData.location)}`;
                window.open(googleCalendarUrl, '_blank');
                showTemporaryMessage('Opening Google Calendar...', 'info');
            });
            eventBox.appendChild(addToCalendarButton);
        } else {
            const noEventMessage = document.createElement('p');
            noEventMessage.textContent = "No event details found or generated.";
            eventBox.appendChild(noEventMessage);
        }

        document.body.appendChild(eventBox);

        setTimeout(() => {
            listBox.classList.add('show');
        }, 10);

        console.log("Content script: Calendar event box displayed on page.");
    }


    // Displays a summary of selected text in an overlay.
    function displaySelectedTextSummary(summaryText, error = null) {
        let existingSummaryBox = document.getElementById('ai-augmenter-selected-summary-box');
        if (existingSummaryBox) {
            existingSummaryBox.remove();
        }

        const summaryBox = document.createElement('div');
        summaryBox.id = 'ai-augmenter-selected-summary-box';
        summaryBox.className = `
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-6 rounded-lg shadow-xl
            max-w-md w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const summaryStyle = document.createElement('style');
        summaryStyle.textContent = `
            #ai-augmenter-selected-summary-box {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
                width: 90% !important;
                max-width: 450px !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1.5rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                font-size: 1rem !important;
                line-height: 1.6 !important;
                opacity: 0;
                transform: translate(-50%, -60%); /* Start slightly higher for animation */
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
            }
            #ai-augmenter-selected-summary-box.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
            #ai-augmenter-selected-summary-box h3 {
                font-weight: bold !important;
                margin-bottom: 0.75rem !important;
                color: #1f2937 !important;
                font-size: 1.1rem !important;
            }
            #ai-augmenter-selected-summary-box p {
                margin-bottom: 1rem !important;
                flex-grow: 1 !important; /* Allow content to take available space */
                overflow-y: auto; /* Make content scrollable if too long */
            }
            #ai-augmenter-selected-summary-box button.close-btn-selected-summary {
                background: none !important;
                border: none !important;
                font-size: 1.5rem !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                color: #6b7280 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
            }
            #ai-augmenter-selected-summary-box button.close-btn-selected-summary:hover {
                color: #1f2937 !important;
            }
            #ai-augmenter-selected-summary-box .error-message {
                color: #dc2626 !important;
                font-weight: bold !important;
                margin-bottom: 1rem !important;
            }
        `;
        document.head.appendChild(summaryStyle);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close summary';
        closeButton.className = 'close-btn-selected-summary';
        closeButton.addEventListener('click', () => {
            summaryBox.classList.remove('show');
            setTimeout(() => summaryStyle.remove(), 300);
            setTimeout(() => summaryBox.remove(), 300);
        });
        summaryBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'Summary of Selected Text:';
        summaryBox.appendChild(heading);

        if (error) {
            const errorMessage = document.createElement('p');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Error: ${error}`;
            summaryBox.appendChild(errorMessage);
        } else {
            const contentParagraph = document.createElement('p');
            contentParagraph.textContent = summaryText;
            summaryBox.appendChild(contentParagraph);
        }

        document.body.appendChild(summaryBox);

        setTimeout(() => {
            summaryBox.classList.add('show');
        }, 10);

        console.log("Content script: Selected text summary box displayed on page.");
    }

    // Displays AI description of an image in an overlay.
    function displayImageDescription(descriptionText, error = null) {
        let existingDescriptionBox = document.getElementById('ai-augmenter-image-description-box');
        if (existingDescriptionBox) {
            existingDescriptionBox.remove();
        }

        const descriptionBox = document.createElement('div');
        descriptionBox.id = 'ai-augmenter-image-description-box';
        descriptionBox.className = `
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-6 rounded-lg shadow-xl
            max-w-md w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const descriptionStyle = document.createElement('style');
        descriptionStyle.textContent = `
            #ai-augmenter-image-description-box {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
                width: 90% !important;
                max-width: 450px !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1.5rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                font-size: 1rem !important;
                line-height: 1.6 !important;
                opacity: 0;
                transform: translate(-50%, -60%); /* Start slightly higher for animation */
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
            }
            #ai-augmenter-image-description-box.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
            #ai-augmenter-image-description-box h3 {
                font-weight: bold !important;
                margin-bottom: 0.75rem !important;
                color: #1f2937 !important;
                font-size: 1.1rem !important;
            }
            #ai-augmenter-image-description-box p {
                margin-bottom: 1rem !important;
                flex-grow: 1 !important; /* Allow content to take available space */
                overflow-y: auto; /* Make content scrollable if too long */
            }
            #ai-augmenter-image-description-box button.close-btn-img-desc {
                background: none !important;
                border: none !important;
                font-size: 1.5rem !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                color: #6b7280 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
            }
            #ai-augmenter-image-description-box button.close-btn-img-desc:hover {
                color: #1f2937 !important;
            }
            #ai-augmenter-image-description-box .error-message {
                color: #dc2626 !important;
                font-weight: bold !important;
                margin-bottom: 1rem !important;
            }
        `;
        document.head.appendChild(descriptionStyle);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close description';
        closeButton.className = 'close-btn-img-desc';
        closeButton.addEventListener('click', () => {
            descriptionBox.classList.remove('show');
            setTimeout(() => descriptionStyle.remove(), 300);
            setTimeout(() => descriptionBox.remove(), 300);
        });
        descriptionBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'Image Description:';
        descriptionBox.appendChild(heading);

        if (error) {
            const errorMessage = document.createElement('p');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Error: ${error}`;
            descriptionBox.appendChild(errorMessage);
        } else {
            const contentParagraph = document.createElement('p');
            contentParagraph.textContent = descriptionText;
            descriptionBox.appendChild(contentParagraph);
        }

        document.body.appendChild(descriptionBox);

        setTimeout(() => {
            descriptionBox.classList.add('show');
        }, 10);

        console.log("Content script: Image description box displayed on page.");
    }


    // Displays the main AI augmentation summary and suggested action.
    function displayAiAugmentation(summaryText, suggestedAction, originalLanguage) {
        let existingSummaryBox = document.getElementById('ai-augmenter-summary-box');
        if (existingSummaryBox) {
            existingSummaryBox.remove();
        }

        const summaryBox = document.createElement('div');
        summaryBox.id = 'ai-augmenter-summary-box';
        summaryBox.className = `
            fixed top-4 right-4 z-50
            bg-blue-50 border border-blue-200
            text-blue-800 p-4 rounded-lg shadow-md
            max-w-sm text-sm leading-relaxed
            transition-all duration-300 ease-in-out
        `;
        const augmentationBoxStyle = document.createElement('style');
        augmentationBoxStyle.textContent = `
            #ai-augmenter-summary-box {
                position: fixed !important;
                top: 1rem !important;
                right: 1rem !important;
                z-index: 2147483647 !important;
                width: 100% !important;
                max-width: 380px !important;
                background-color: #e0f2fe !important;
                border: 1px solid #90cdf4 !important;
                color: #2b6cb0 !important;
                padding: 1rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
                font-size: 0.9rem !important;
                line-height: 1.5 !important;
                opacity: 0;
                transform: translateY(-20px);
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
            }
            #ai-augmenter-summary-box.show {
                opacity: 1;
                transform: translateY(0);
            }
            #ai-augmenter-summary-box h3 {
                font-weight: bold !important;
                margin-bottom: 0.5rem !important;
                color: #1a4e8d !important;
            }
            #ai-augmenter-summary-box button.close-btn {
                background: none !important;
                border: none !important;
                font-size: 1.2rem !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                color: #2b6cb0 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
            }
            #ai-augmenter-summary-box button.close-btn:hover {
                color: #1a4e8d !important;
            }

            /* Styles for the primary action button */
            #ai-augmenter-summary-box .primary-action-button {
                display: block !important;
                width: fit-content !important;
                margin-top: 1rem !important;
                padding: 0.5rem 1rem !important;
                background-color: #3b82f6 !important; /* blue-500 */
                color: white !important;
                border: none !important;
                border-radius: 0.5rem !important;
                font-size: 0.85rem !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease-in-out !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            }
            #ai-augmenter-summary-box .primary-action-button:hover {
                background-color: #2563eb !important; /* blue-600 */
            }

            /* Styles for the secondary action buttons container */
            #ai-augmenter-summary-box .secondary-actions-container {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 0.5rem !important;
                margin-top: 0.75rem !important;
                padding-top: 0.75rem !important;
                border-top: 1px solid #bfdbfe !important;
            }

            /* Styles for individual secondary action buttons */
            #ai-augmenter-summary-box .secondary-action-button {
                flex-grow: 1 !important;
                min-width: 100px !important;
                padding: 0.4rem 0.8rem !important;
                background-color: #cbd5e1 !important; /* gray-300 */
                color: #1f2937 !important; /* gray-800 */
                border: none !important;
                border-radius: 0.5rem !important;
                font-size: 0.8rem !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease-in-out !important;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
            }
            #ai-augmenter-summary-box .secondary-action-button:hover {
                background-color: #94a3b8 !important;
            }
        `;
        document.head.appendChild(augmentationBoxStyle);


        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close summary';
        closeButton.className = 'close-btn';
        closeButton.addEventListener('click', () => {
            summaryBox.classList.remove('show');
            setTimeout(() => augmentationBoxStyle.remove(), 300);
            setTimeout(() => summaryBox.remove(), 300);
        });
        summaryBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'AI Summary & Topic:';
        summaryBox.appendChild(heading);

        const contentParagraph = document.createElement('p');
        contentParagraph.textContent = summaryText;
        summaryBox.appendChild(contentParagraph);

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'action-buttons-container';
        summaryBox.appendChild(actionsContainer);

        // Determine the primary action based on AI suggestion AND original language.
        let finalSuggestedAction = { ...suggestedAction }; // Copy to avoid modifying original.
        if (originalLanguage && originalLanguage.toLowerCase() !== 'english' && suggestedAction.type !== 'translate_summary') {
            // If original page is not English, and AI didn't already suggest translate, force it.
            finalSuggestedAction = {
                text: "Translate to English",
                type: "translate_summary"
            };
            console.log("Content script: Forcing 'Translate to English' action due to non-English original language.");
        }


        if (finalSuggestedAction && finalSuggestedAction.text && finalSuggestedAction.type) {
            const primaryActionButton = document.createElement('button');
            primaryActionButton.textContent = finalSuggestedAction.text;
            primaryActionButton.className = 'primary-action-button';
            primaryActionButton.addEventListener('click', () => {
                switch (finalSuggestedAction.type) { // Use finalSuggestedAction.type here
                    case 'read_more':
                        summaryBox.classList.remove('show');
                        setTimeout(() => augmentationBoxStyle.remove(), 300);
                        setTimeout(() => summaryBox.remove(), 300);
                        console.log("Action: Read More (summary box closed)");
                        break;
                    case 'copy_summary':
                        copyToClipboard(summaryText, primaryActionButton);
                        showTemporaryMessage('Summary copied to clipboard!', 'success');
                        console.log("Action: Copy Summary");
                        break;
                    case 'web_search':
                        const searchQuery = summaryText.split('. ')[0];
                        performWebSearch(searchQuery);
                        showTemporaryMessage('Opening web search in new tab...', 'info');
                        console.log("Action: Web Search");
                        break;
                    case 'explain_in_simple_terms':
                        const textToExplain = summaryText;
                        if (_currentTabId) {
                            console.log("Content script: Sending 'explain_in_simple_terms' request to background.js using stored tabId:", _currentTabId);
                            chrome.runtime.sendMessage({
                                action: "askAiQuestion",
                                question: `Explain this in simple terms: "${textToExplain}"`,
                                tabId: _currentTabId,
                                isSimpleExplanationRequest: true
                            });
                            showTemporaryMessage('Asking AI for a simpler explanation...', 'info');
                            summaryBox.classList.remove('show');
                            setTimeout(() => augmentationBoxStyle.remove(), 300);
                            setTimeout(() => summaryBox.remove(), 300);
                        } else {
                            console.error("Content script: _currentTabId is null. Cannot send 'Explain in Simple Terms' request.");
                            showTemporaryMessage('Error: Tab ID not available for AI explanation.', 'error');
                        }
                        break;
                    case 'generate_shopping_list':
                        const pageContentForList = extractMainContent();
                        if (pageContentForList && _currentTabId) {
                            console.log("Content script: Sending 'generateShoppingList' request to background.js using stored tabId:", _currentTabId);
                            chrome.runtime.sendMessage({
                                action: "generateShoppingList",
                                content: pageContentForList,
                                tabId: _currentTabId
                            });
                            showTemporaryMessage('Generating shopping list...', 'info');
                            summaryBox.classList.remove('show');
                            setTimeout(() => augmentationBoxStyle.remove(), 300);
                            setTimeout(() => summaryBox.remove(), 300);
                        } else {
                            console.error("Content script: Could not get page content or tab ID for shopping list generation.");
                            showTemporaryMessage('Error: Cannot generate shopping list without page content.', 'error');
                        }
                        break;
                    case 'translate_summary':
                        const summaryToTranslate = summaryText;
                        const targetLang = "English"; // Hardcoded target language for now
                        if (summaryToTranslate && _currentTabId) {
                            console.log(`Content script: Sending 'translateSummary' request to background.js for "${targetLang}"`);
                            chrome.runtime.sendMessage({
                                action: "translateSummary",
                                summaryText: summaryToTranslate,
                                targetLanguage: targetLang,
                                tabId: _currentTabId
                            });
                            showTemporaryMessage(`Translating summary to ${targetLang}...`, 'info');
                            summaryBox.classList.remove('show');
                            setTimeout(() => augmentationBoxStyle.remove(), 300);
                            setTimeout(() => summaryBox.remove(), 300);
                        } else {
                            console.error("Content script: Could not get summary text or tab ID for translation.");
                            showTemporaryMessage('Error: Cannot translate summary.', 'error');
                        }
                        break;
                    case 'add_to_calendar':
                        const pageContentForEvent = extractMainContent();
                        if (pageContentForEvent && _currentTabId) {
                            console.log("Content script: Sending 'addToCalendar' request to background.js using stored tabId:", _currentTabId);
                            chrome.runtime.sendMessage({
                                action: "addToCalendar",
                                content: pageContentForEvent,
                                tabId: _currentTabId
                            });
                            showTemporaryMessage('Extracting event details...', 'info');
                            summaryBox.classList.remove('show');
                            setTimeout(() => augmentationBoxStyle.remove(), 300);
                            setTimeout(() => summaryBox.remove(), 300);
                        } else {
                            console.error("Content script: Could not get page content or tab ID for calendar event generation.");
                            showTemporaryMessage('Error: Cannot add event to calendar without page content.', 'error');
                        }
                        break;
                    default:
                        showTemporaryMessage(`Action: "${finalSuggestedAction.text}" (${finalSuggestedAction.type}) triggered! (No specific implementation yet)`, 'info');
                        console.log(`Action: "${finalSuggestedAction.text}" (${finalSuggestedAction.type}) triggered!`);
                        break;
                }
            });
            actionsContainer.appendChild(primaryActionButton);
        }

        const secondaryActionsDiv = document.createElement('div');
        secondaryActionsDiv.className = 'secondary-actions-container';
        actionsContainer.appendChild(secondaryActionsDiv);

        const copySummarySecondaryBtn = document.createElement('button');
        copySummarySecondaryBtn.textContent = 'Copy Summary';
        copySummarySecondaryBtn.className = 'secondary-action-button';
        copySummarySecondaryBtn.addEventListener('click', () => {
            copyToClipboard(summaryText, copySummarySecondaryBtn);
            showTemporaryMessage('Summary copied to clipboard!', 'success');
            console.log("Secondary Action: Copy Summary");
        });
        secondaryActionsDiv.appendChild(copySummarySecondaryBtn);

        // Only add a secondary web search button if the primary action is NOT already a web search
        if (finalSuggestedAction.type !== 'web_search') {
            const webSearchSecondaryBtn = document.createElement('button');
            webSearchSecondaryBtn.textContent = 'Search on Google'; // More direct name
            webSearchSecondaryBtn.className = 'secondary-action-button';
            webSearchSecondaryBtn.addEventListener('click', () => {
                const searchQuery = summaryText.split('. ')[0]; // Use the first sentence of the summary as query
                performWebSearch(searchQuery);
                showTemporaryMessage('Opening web search in new tab...', 'info');
                console.log("Secondary Action: Web Search");
            });
            secondaryActionsDiv.appendChild(webSearchSecondaryBtn);
        }


        document.body.appendChild(summaryBox);

        setTimeout(() => {
            summaryBox.classList.add('show');
        }, 10);

        console.log("Content script: AI Augmentation box displayed on page.");
    }

    // Displays an interactive quiz in an overlay.
    function displayQuiz(quizData, error = null) {
        let existingQuizBox = document.getElementById('ai-augmenter-quiz-box');
        if (existingQuizBox) {
            existingQuizBox.remove(); // Remove any existing quiz box.
        }

        const quizBox = document.createElement('div');
        quizBox.id = 'ai-augmenter-quiz-box';
        // Add Tailwind-like classes for initial styling and positioning
        quizBox.className = `
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-6 rounded-lg shadow-xl
            max-w-xl w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const quizStyle = document.createElement('style');
        quizStyle.textContent = `
            #ai-augmenter-quiz-box {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
                width: 90% !important;
                max-width: 600px !important; /* Slightly wider for better question display */
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1.75rem !important; /* More padding */
                border-radius: 1rem !important; /* More rounded corners */
                box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.2), 0 8px 15px -5px rgba(0, 0, 0, 0.1) !important; /* Stronger shadow */
                font-family: 'Inter', sans-serif !important; /* Use Inter font */
                font-size: 1rem !important;
                line-height: 1.6 !important;
                opacity: 0;
                transform: translate(-50%, -60%); /* Start slightly higher for animation */
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                min-height: 350px; /* Ensure a minimum height for better appearance */
            }
            #ai-augmenter-quiz-box.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
            #ai-augmenter-quiz-box h3 {
                font-weight: 700 !important; /* Bolder heading */
                margin-bottom: 1.25rem !important; /* More space below heading */
                color: #1a202c !important; /* Darker text for heading */
                font-size: 1.5rem !important; /* Larger heading */
                text-align: center;
            }
            #ai-augmenter-quiz-box .quiz-content {
                flex-grow: 1 !important;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding-bottom: 1rem; /* Padding before navigation buttons */
            }
            #ai-augmenter-quiz-box .question-text {
                font-weight: 600 !important;
                margin-bottom: 1.5rem !important; /* More space below question */
                font-size: 1.25rem !important; /* Larger question text */
                color: #2d3748; /* Slightly darker for question */
            }
            #ai-augmenter-quiz-box .options-container {
                display: flex;
                flex-direction: column;
                gap: 0.75rem; /* Consistent gap between options */
                margin-bottom: 1.5rem; /* More space below options */
            }
            #ai-augmenter-quiz-box .option-button {
                display: block;
                width: 100%;
                padding: 0.85rem 1.25rem; /* Larger padding for options */
                border: 1px solid #e2e8f0; /* Lighter border */
                border-radius: 0.75rem; /* More rounded corners */
                background-color: #f7fafc; /* Lighter background */
                text-align: left;
                cursor: pointer;
                transition: all 0.2s ease-in-out; /* Smooth transitions for all properties */
                box-shadow: 0 1px 3px rgba(0,0,0,0.08); /* Subtle shadow */
                font-size: 1rem;
                color: #4a5568;
            }
            #ai-augmenter-quiz-box .option-button:hover {
                background-color: #edf2f7; /* Slightly darker on hover */
                border-color: #a0aec0; /* Darker border on hover */
                transform: translateY(-2px); /* Slight lift effect */
                box-shadow: 0 4px 8px rgba(0,0,0,0.1); /* Enhanced shadow on hover */
            }
            #ai-augmenter-quiz-box .option-button.selected {
                background-color: #bfdbfe; /* Light blue for selected */
                border-color: #3b82f6; /* Blue for selected border */
                font-weight: 600;
                color: #1e40af; /* Darker blue text */
                box-shadow: 0 2px 5px rgba(0,0,0,0.15);
            }
            #ai-augmenter-quiz-box .option-button.correct {
                background-color: #d1fae5; /* Light green for correct */
                border-color: #10b981; /* Green for correct border */
                font-weight: 700; /* Bolder for correct */
                color: #065f46; /* Darker green text */
                box-shadow: 0 2px 5px rgba(0,0,0,0.15);
            }
            #ai-augmenter-quiz-box .option-button.incorrect {
                background-color: #fee2e2; /* Light red for incorrect */
                border-color: #ef4444; /* Red for incorrect border */
                font-weight: 700; /* Bolder for incorrect */
                color: #991b1b; /* Darker red text */
                box-shadow: 0 2px 5px rgba(0,0,0,0.15);
            }
            #ai-augmenter-quiz-box .feedback-message {
                margin-top: 1rem;
                font-weight: 700; /* Bolder feedback */
                font-size: 1.1rem; /* Larger feedback text */
                text-align: center;
                animation: fadeIn 0.5s ease-out; /* Fade in animation */
            }
            #ai-augmenter-quiz-box .feedback-message.correct {
                color: #065f46; /* Darker green */
            }
            #ai-augmenter-quiz-box .feedback-message.incorrect {
                color: #991b1b; /* Darker red */
            }
            #ai-augmenter-quiz-box .navigation-buttons {
                display: flex;
                justify-content: space-between;
                margin-top: 1.5rem; /* More space above nav buttons */
            }
            #ai-augmenter-quiz-box .nav-button {
                padding: 0.75rem 1.5rem; /* Larger padding for nav buttons */
                background-color: #3b82f6; /* Blue */
                color: white;
                border: none;
                border-radius: 0.75rem; /* More rounded */
                font-weight: 600;
                cursor: pointer;
                transition: background-color 0.2s ease-in-out, transform 0.1s ease-out;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1); /* Shadow for buttons */
                font-size: 1rem;
            }
            #ai-augmenter-quiz-box .nav-button:hover {
                background-color: #2563eb; /* Darker blue on hover */
                transform: translateY(-1px); /* Slight lift */
            }
            #ai-augmenter-quiz-box .nav-button:disabled {
                background-color: #9ca3af; /* Gray for disabled buttons */
                cursor: not-allowed;
                box-shadow: none;
                transform: none;
            }
            #ai-augmenter-quiz-box button.close-btn-quiz {
                background: none !important;
                border: none !important;
                font-size: 1.8rem !important; /* Larger close button */
                cursor: pointer !important;
                position: absolute !important;
                top: 0.75rem !important; /* Adjusted position */
                right: 0.75rem !important; /* Adjusted position */
                color: #6b7280 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
                transition: color 0.2s ease-in-out;
            }
            #ai-augmenter-quiz-box button.close-btn-quiz:hover {
                color: #1f2937 !important;
            }
            #ai-augmenter-quiz-box .error-message {
                color: #dc2626 !important;
                font-weight: bold !important;
                margin-bottom: 1rem !important;
                text-align: center;
            }
            #ai-augmenter-quiz-box .quiz-score {
                text-align: center;
                font-size: 1.3rem; /* Larger score */
                font-weight: 700; /* Bolder score */
                margin-top: 1.5rem; /* More space above score */
                color: #1f2937;
            }

            /* Keyframe for fade-in animation */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(quizStyle);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close Quiz';
        closeButton.className = 'close-btn-quiz';
        closeButton.addEventListener('click', () => {
            quizBox.classList.remove('show');
            setTimeout(() => quizStyle.remove(), 300);
            setTimeout(() => quizBox.remove(), 300);
        });
        quizBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'Interactive Quiz:';
        quizBox.appendChild(heading);

        // Display error message if quiz data is not available.
        if (error) {
            const errorMessage = document.createElement('p');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Error: ${error}`;
            quizBox.appendChild(errorMessage);
            document.body.appendChild(quizBox);
            setTimeout(() => { quizBox.classList.add('show'); }, 10);
            return;
        }

        // Display message if no quiz questions could be generated.
        if (!quizData || quizData.length === 0) {
            const noQuizMessage = document.createElement('p');
            noQuizMessage.textContent = "No quiz questions could be generated from the page content.";
            quizBox.appendChild(noQuizMessage);
            document.body.appendChild(quizBox);
            setTimeout(() => { quizBox.classList.add('show'); }, 10);
            return;
        }

        let currentQuestionIndex = 0; // Tracks the current question being displayed.
        let score = 0; // Tracks the user's score.
        let selectedAnswer = null; // Stores the user's selected answer for the current question.
        let answeredQuestions = new Set(); // Stores indices of questions already answered to prevent re-scoring.

        const quizContent = document.createElement('div');
        quizContent.className = 'quiz-content';
        quizBox.appendChild(quizContent);

        // Function to render the current question and its options.
        function renderQuestion() {
            quizContent.innerHTML = ''; // Clear previous question content.

            const questionObj = quizData[currentQuestionIndex];

            const questionText = document.createElement('p');
            questionText.className = 'question-text';
            questionText.textContent = `Q${currentQuestionIndex + 1}. ${questionObj.question}`;
            quizContent.appendChild(questionText);

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'options-container';
            quizContent.appendChild(optionsContainer);

            // Shuffle options to prevent the AI from always putting the correct answer in the same spot.
            const shuffledOptions = [...questionObj.options].sort(() => Math.random() - 0.5);

            // Create buttons for each option.
            shuffledOptions.forEach(option => {
                const optionButton = document.createElement('button');
                optionButton.className = 'option-button';
                optionButton.textContent = option;
                // Attach click listener to select the option.
                optionButton.addEventListener('click', () => selectOption(optionButton, option, questionObj.correctAnswer));
                optionsContainer.appendChild(optionButton);
            });

            const feedbackMessage = document.createElement('p');
            feedbackMessage.className = 'feedback-message';
            quizContent.appendChild(feedbackMessage);

            const navigationButtons = document.createElement('div');
            navigationButtons.className = 'navigation-buttons';
            quizContent.appendChild(navigationButtons);

            // Previous button.
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Previous';
            prevButton.className = 'nav-button';
            prevButton.disabled = currentQuestionIndex === 0; // Disable if on the first question.
            prevButton.addEventListener('click', () => {
                currentQuestionIndex--;
                renderQuestion(); // Re-render the previous question.
            });
            navigationButtons.appendChild(prevButton);

            // Next button.
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next';
            nextButton.className = 'nav-button';
            nextButton.disabled = currentQuestionIndex === quizData.length - 1; // Disable if on the last question.
            nextButton.addEventListener('click', () => {
                currentQuestionIndex++;
                renderQuestion(); // Re-render the next question.
            });
            navigationButtons.appendChild(nextButton);

            // If the current question has already been answered, restore its state.
            if (answeredQuestions.has(currentQuestionIndex)) {
                const allOptionButtons = optionsContainer.querySelectorAll('.option-button');
                allOptionButtons.forEach(btn => {
                    btn.disabled = true; // Disable interaction on answered questions.
                    if (btn.textContent === questionObj.correctAnswer) {
                        btn.classList.add('correct'); // Highlight the correct answer.
                    } else if (btn.classList.contains('selected')) {
                        btn.classList.add('incorrect'); // Highlight the user's incorrect selection.
                    }
                });
                feedbackMessage.textContent = `Correct Answer: ${questionObj.correctAnswer}`;
                feedbackMessage.classList.add('correct'); // Show correct answer feedback.
            }
        }

        // Handles user selecting an option for a question.
        function selectOption(selectedButton, selectedValue, correctAnswer) {
            const allOptionButtons = selectedButton.parentNode.querySelectorAll('.option-button');
            allOptionButtons.forEach(btn => {
                btn.disabled = true; // Disable all options after one is selected.
                btn.classList.remove('selected'); // Remove any previous selection highlight.
            });

            selectedButton.classList.add('selected'); // Mark the selected option.
            selectedAnswer = selectedValue;

            const feedbackMessage = quizContent.querySelector('.feedback-message');

            if (selectedAnswer === correctAnswer) {
                feedbackMessage.textContent = 'Correct!';
                feedbackMessage.className = 'feedback-message correct';
                if (!answeredQuestions.has(currentQuestionIndex)) {
                    score++; // Increment score only if not already answered.
                }
            } else {
                feedbackMessage.textContent = `Incorrect. Correct Answer: ${correctAnswer}`;
                feedbackMessage.className = 'feedback-message incorrect';
            }
            answeredQuestions.add(currentQuestionIndex); // Mark question as answered.

            // Update score display.
            const scoreDisplay = document.getElementById('quiz-score-display');
            if (scoreDisplay) {
                scoreDisplay.textContent = `Score: ${score}/${quizData.length}`;
            }
        }

        // Add a score display element to the quiz box.
        const scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'quiz-score-display';
        scoreDisplay.className = 'quiz-score';
        scoreDisplay.textContent = `Score: ${score}/${quizData.length}`;
        quizBox.appendChild(scoreDisplay);

        // Append the main quiz box to the document body.
        document.body.appendChild(quizBox);
        // Animate the quiz box into view.
        setTimeout(() => { quizBox.classList.add('show'); }, 10);

        renderQuestion(); // Initial render of the first question.
        console.log("Content script: Quiz box displayed on page.");
    }

    // Function to prompt the user for a target language and then initiate translation.
    function promptForLanguageAndTranslate() {
        let existingPromptBox = document.getElementById('ai-augmenter-language-prompt-box');
        if (existingPromptBox) {
            existingPromptBox.remove();
        }

        const promptBox = document.createElement('div');
        promptBox.id = 'ai-augmenter-language-prompt-box';
        promptBox.className = `
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-6 rounded-lg shadow-xl
            max-w-xs w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col items-center
        `;
        const promptBoxStyle = document.createElement('style');
        promptBoxStyle.textContent = `
            #ai-augmenter-language-prompt-box {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
                width: 90% !important;
                max-width: 350px !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1.5rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                font-family: 'Inter', sans-serif !important;
                font-size: 1rem !important;
                line-height: 1.6 !important;
                opacity: 0;
                transform: translate(-50%, -60%);
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
            }
            #ai-augmenter-language-prompt-box.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
            #ai-augmenter-language-prompt-box h3 {
                font-weight: bold !important;
                margin-bottom: 1rem !important;
                color: #1f2937 !important;
                font-size: 1.2rem !important;
                text-align: center;
            }
            #ai-augmenter-language-prompt-box input[type="text"] {
                width: 100% !important;
                padding: 0.75rem !important;
                margin-bottom: 1rem !important;
                border: 1px solid #d1d5db !important;
                border-radius: 0.5rem !important;
                font-size: 1rem !important;
                box-sizing: border-box !important;
            }
            #ai-augmenter-language-prompt-box button.submit-btn {
                padding: 0.75rem 1.5rem !important;
                background-color: #3b82f6 !important;
                color: white !important;
                border: none !important;
                border-radius: 0.5rem !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease-in-out !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            }
            #ai-augmenter-language-prompt-box button.submit-btn:hover {
                background-color: #2563eb !important;
            }
            #ai-augmenter-language-prompt-box button.close-btn-prompt {
                background: none !important;
                border: none !important;
                font-size: 1.5rem !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                color: #6b7280 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
            }
            #ai-augmenter-language-prompt-box button.close-btn-prompt:hover {
                color: #1f2937 !important;
            }
        `;
        document.head.appendChild(promptBoxStyle);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close';
        closeButton.className = 'close-btn-prompt';
        closeButton.addEventListener('click', () => {
            promptBox.classList.remove('show');
            setTimeout(() => promptBoxStyle.remove(), 300);
            setTimeout(() => promptBox.remove(), 300);
        });
        promptBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'Translate Page To:';
        promptBox.appendChild(heading);

        const languageInput = document.createElement('input');
        languageInput.type = 'text';
        languageInput.placeholder = 'e.g., Spanish, French, German';
        languageInput.setAttribute('aria-label', 'Target language for translation');
        promptBox.appendChild(languageInput);

        const submitButton = document.createElement('button');
        submitButton.textContent = 'Translate';
        submitButton.className = 'submit-btn';
        submitButton.addEventListener('click', () => {
            const targetLanguage = languageInput.value.trim();
            if (targetLanguage) {
                const pageContent = extractMainContent();
                if (pageContent && _currentTabId) {
                    console.log(`Content script: Sending 'translatePageContent' request to background.js using stored tabId:`, _currentTabId);
                    chrome.runtime.sendMessage({
                        action: "translatePageContent",
                        content: pageContent,
                        targetLanguage: targetLanguage,
                        tabId: _currentTabId
                    });
                    showTemporaryMessage(`Translating page to ${targetLanguage}...`, 'info');
                    promptBox.classList.remove('show');
                    setTimeout(() => promptBoxStyle.remove(), 300);
                    setTimeout(() => promptBox.remove(), 300);
                } else {
                    const errorMessage = "Could not extract page content or valid tab ID for page translation. Please ensure the page has text content and try again.";
                    console.error("Content script:", errorMessage);
                    showTemporaryMessage(`Error: ${errorMessage}`, 'error');
                }
            } else {
                showTemporaryMessage('Please enter a target language.', 'error');
            }
        });
        promptBox.appendChild(submitButton);

        document.body.appendChild(promptBox);

        setTimeout(() => {
            promptBox.classList.add('show');
            languageInput.focus(); // Focus the input field
        }, 10);

        console.log("Content script: Language prompt box displayed on page.");
    }

    // Displays the translated page content in an overlay.
    function displayTranslatedPageContent(translatedText, error = null) {
        let existingTranslatedPageBox = document.getElementById('ai-augmenter-translated-page-box');
        if (existingTranslatedPageBox) {
            existingTranslatedPageBox.remove();
        }

        const translatedPageBox = document.createElement('div');
        translatedPageBox.id = 'ai-augmenter-translated-page-box';
        translatedPageBox.className = `
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-6 rounded-lg shadow-xl
            max-w-2xl w-[95%] h-[80%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const translatedPageStyle = document.createElement('style');
        translatedPageStyle.textContent = `
            #ai-augmenter-translated-page-box {
                position: fixed !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) !important;
                z-index: 2147483647 !important;
                width: 95% !important;
                max-width: 800px !important; /* Wider for page content */
                height: 80% !important; /* Taller for page content */
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1.5rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
                font-family: 'Inter', sans-serif !important;
                font-size: 1rem !important;
                line-height: 1.6 !important;
                opacity: 0;
                transform: translate(-50%, -60%);
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
            }
            #ai-augmenter-translated-page-box.show {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
            #ai-augmenter-translated-page-box h3 {
                font-weight: bold !important;
                margin-bottom: 0.75rem !important;
                color: #1f2937 !important;
                font-size: 1.1rem !important;
            }
            #ai-augmenter-translated-page-box .translated-content-scroll {
                flex-grow: 1 !important;
                overflow-y: auto !important; /* Make content scrollable */
                padding-right: 10px; /* Space for scrollbar */
            }
            #ai-augmenter-translated-page-box p {
                margin-bottom: 1rem !important;
            }
            #ai-augmenter-translated-page-box button.close-btn-translated-page {
                background: none !important;
                border: none !important;
                font-size: 1.5rem !important;
                cursor: pointer !important;
                position: absolute !important;
                top: 0.5rem !important;
                right: 0.5rem !important;
                color: #6b7280 !important;
                line-height: 1 !important;
                padding: 0.25rem !important;
                display: block !important;
            }
            #ai-augmenter-translated-page-box button.close-btn-translated-page:hover {
                color: #1f2937 !important;
            }
            #ai-augmenter-translated-page-box .error-message {
                color: #dc2626 !important;
                font-weight: bold !important;
                margin-bottom: 1rem !important;
            }
        `;
        document.head.appendChild(translatedPageStyle);

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.title = 'Close translated page';
        closeButton.className = 'close-btn-translated-page';
        closeButton.addEventListener('click', () => {
            translatedPageBox.classList.remove('show');
            setTimeout(() => translatedPageStyle.remove(), 300);
            setTimeout(() => translatedPageBox.remove(), 300);
        });
        translatedPageBox.appendChild(closeButton);

        const heading = document.createElement('h3');
        heading.textContent = 'Translated Page Content:';
        translatedPageBox.appendChild(heading);

        const contentScrollDiv = document.createElement('div');
        contentScrollDiv.className = 'translated-content-scroll';
        translatedPageBox.appendChild(contentScrollDiv);

        if (error) {
            const errorMessage = document.createElement('p');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Error: ${error}`;
            contentScrollDiv.appendChild(errorMessage);
        } else {
            // Use innerHTML to render formatted text from AI (paragraphs, lists etc.)
            contentScrollDiv.innerHTML = translatedText;
        }

        document.body.appendChild(translatedPageBox);

        setTimeout(() => {
            translatedPageBox.classList.add('show');
        }, 10);

        console.log("Content script: Translated page content box displayed on page.");
    }

    // --- NEW: Productivity Feature UI (Purpose Prompt) ---
    function displayPurposePrompt(questionText) {
        let existingPrompt = document.getElementById('ai-augmenter-purpose-prompt');
        if (existingPrompt) {
            existingPrompt.remove(); // Remove any existing prompt
        }

        const promptBox = document.createElement('div');
        promptBox.id = 'ai-augmenter-purpose-prompt';
        promptBox.className = `
            fixed bottom-4 right-4 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-4 rounded-lg shadow-xl
            max-w-sm w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const promptStyle = document.createElement('style');
        promptStyle.textContent = `
            #ai-augmenter-purpose-prompt {
                position: fixed !important;
                bottom: 1rem !important;
                right: 1rem !important;
                z-index: 2147483647 !important;
                width: 100% !important;
                max-width: 350px !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2) !important;
                font-family: 'Inter', sans-serif !important;
                font-size: 0.95rem !important;
                line-height: 1.5 !important;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
            }
            #ai-augmenter-purpose-prompt.show {
                opacity: 1;
                transform: translateY(0);
            }
            #ai-augmenter-purpose-prompt h3 {
                font-weight: bold !important;
                margin-bottom: 0.75rem !important;
                color: #1f2937 !important;
                font-size: 1.1rem !important;
            }
            #ai-augmenter-purpose-prompt input[type="text"] {
                width: 100% !important;
                padding: 0.6rem 0.8rem !important;
                margin-bottom: 0.75rem !important;
                border: 1px solid #d1d5db !important;
                border-radius: 0.4rem !important;
                font-size: 0.9rem !important;
                box-sizing: border-box !important;
            }
            #ai-augmenter-purpose-prompt .button-group {
                display: flex !important;
                gap: 0.5rem !important;
                justify-content: flex-end !important;
                margin-top: 0.5rem !important;
            }
            #ai-augmenter-purpose-prompt button {
                padding: 0.5rem 1rem !important;
                border: none !important;
                border-radius: 0.4rem !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease-in-out !important;
                box-shadow: 0 1px 2px rgba(0,0,0,0.08) !important;
            }
            #ai-augmenter-purpose-prompt button.submit-purpose-btn {
                background-color: #3b82f6 !important; /* blue-500 */
                color: white !important;
            }
            #ai-augmenter-purpose-prompt button.submit-purpose-btn:hover {
                background-color: #2563eb !important; /* blue-600 */
            }
            #ai-augmenter-purpose-prompt button.cancel-purpose-btn {
                background-color: #e5e7eb !important; /* gray-200 */
                color: #374151 !important; /* gray-700 */
            }
            #ai-augmenter-purpose-prompt button.cancel-purpose-btn:hover {
                background-color: #d1d5db !important; /* gray-300 */
            }
        `;
        document.head.appendChild(promptStyle);

        const heading = document.createElement('h3');
        heading.textContent = questionText;
        promptBox.appendChild(heading);

        const purposeInput = document.createElement('input');
        purposeInput.type = 'text';
        purposeInput.placeholder = 'e.g., "Check quick news", "Watch a short tutorial"';
        purposeInput.setAttribute('aria-label', 'Your purpose for visiting this site');
        promptBox.appendChild(purposeInput);

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        promptBox.appendChild(buttonGroup);

        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit Purpose';
        submitButton.className = 'submit-purpose-btn';
        submitButton.addEventListener('click', () => {
            const purpose = purposeInput.value.trim();
            if (purpose) {
                chrome.runtime.sendMessage({
                    action: "submitPurpose",
                    purpose: purpose,
                    tabId: _currentTabId // Ensure tabId is sent
                });
                showTemporaryMessage('Purpose recorded!', 'success');
                promptBox.classList.remove('show');
                setTimeout(() => promptStyle.remove(), 300);
                setTimeout(() => promptBox.remove(), 300);
            } else {
                showTemporaryMessage('Please enter your purpose.', 'error');
            }
        });
        buttonGroup.appendChild(submitButton);

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'cancel-purpose-btn';
        cancelButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({
                action: "cancelPurposePrompt",
                tabId: _currentTabId // Ensure tabId is sent
            });
            promptBox.classList.remove('show');
            setTimeout(() => promptStyle.remove(), 300);
            setTimeout(() => promptBox.remove(), 300);
        });
        buttonGroup.appendChild(cancelButton);

        document.body.appendChild(promptBox);

        setTimeout(() => {
            promptBox.classList.add('show');
            purposeInput.focus(); // Focus the input field
        }, 10);

        console.log("Content script: Purpose prompt displayed on page.");
    }

    // --- NEW: Productivity Feature UI (Work Done Prompt) ---
    function displayWorkDonePrompt(questionText) {
        let existingPrompt = document.getElementById('ai-augmenter-work-done-prompt');
        if (existingPrompt) {
            existingPrompt.remove(); // Remove any existing prompt
        }

        const promptBox = document.createElement('div');
        promptBox.id = 'ai-augmenter-work-done-prompt';
        promptBox.className = `
            fixed bottom-4 right-4 z-[2147483647]
            bg-white border border-gray-300
            text-gray-800 p-4 rounded-lg shadow-xl
            max-w-sm w-[90%] text-base leading-relaxed
            transition-all duration-300 ease-in-out
            flex flex-col
        `;
        const promptStyle = document.createElement('style');
        promptStyle.textContent = `
            #ai-augmenter-work-done-prompt {
                position: fixed !important;
                bottom: 1rem !important;
                right: 1rem !important;
                z-index: 2147483647 !important;
                width: 100% !important;
                max-width: 350px !important;
                background-color: #ffffff !important;
                border: 1px solid #d1d5db !important;
                color: #1f2937 !important;
                padding: 1rem !important;
                border-radius: 0.75rem !important;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2) !important;
                font-family: 'Inter', sans-serif !important;
                font-size: 0.95rem !important;
                line-height: 1.5 !important;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s ease-out, transform 0.3s ease-out;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
            }
            #ai-augmenter-work-done-prompt.show {
                opacity: 1;
                transform: translateY(0);
            }
            #ai-augmenter-work-done-prompt h3 {
                font-weight: bold !important;
                margin-bottom: 0.75rem !important;
                color: #1f2937 !important;
                font-size: 1.1rem !important;
            }
            #ai-augmenter-work-done-prompt .button-group {
                display: flex !important;
                gap: 0.5rem !important;
                justify-content: flex-end !important;
                margin-top: 0.5rem !important;
            }
            #ai-augmenter-work-done-prompt button {
                padding: 0.5rem 1rem !important;
                border: none !important;
                border-radius: 0.4rem !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background-color 0.2s ease-in-out !important;
                box-shadow: 0 1px 2px rgba(0,0,0,0.08) !important;
            }
            #ai-augmenter-work-done-prompt button.yes-btn {
                background-color: #10b981 !important; /* green-500 */
                color: white !important;
            }
            #ai-augmenter-work-done-prompt button.yes-btn:hover {
                background-color: #059669 !important; /* green-600 */
            }
            #ai-augmenter-work-done-prompt button.no-btn {
                background-color: #ef4444 !important; /* red-500 */
                color: white !important;
            }
            #ai-augmenter-work-done-prompt button.no-btn:hover {
                background-color: #dc2626 !important; /* red-600 */
            }
        `;
        document.head.appendChild(promptStyle);

        const heading = document.createElement('h3');
        heading.textContent = questionText;
        promptBox.appendChild(heading);

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        promptBox.appendChild(buttonGroup);

        const yesButton = document.createElement('button');
        yesButton.textContent = 'Yes';
        yesButton.className = 'yes-btn';
        yesButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({
                action: "workDoneResponse",
                response: "yes",
                tabId: _currentTabId
            });
            showTemporaryMessage('Great! Keep up the good work!', 'success');
            promptBox.classList.remove('show');
            setTimeout(() => promptStyle.remove(), 300);
            setTimeout(() => promptBox.remove(), 300);
        });
        buttonGroup.appendChild(yesButton);

        const noButton = document.createElement('button');
        noButton.textContent = 'No';
        noButton.className = 'no-btn';
        noButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({
                action: "workDoneResponse",
                response: "no",
                tabId: _currentTabId
            });
            showTemporaryMessage('Time to refocus!', 'info');
            promptBox.classList.remove('show');
            setTimeout(() => promptStyle.remove(), 300);
            setTimeout(() => promptBox.remove(), 300);
        });
        buttonGroup.appendChild(noButton);

        document.body.appendChild(promptBox);

        setTimeout(() => {
            promptBox.classList.add('show');
        }, 10);

        console.log("Content script: Work done prompt displayed on page.");
    }

    // Function to clear the purpose prompt (used when background script sends a message)
    function clearPurposePrompt() {
        const promptBox = document.getElementById('ai-augmenter-purpose-prompt');
        if (promptBox) {
            const promptStyle = document.querySelector('style[id*="ai-augmenter-purpose-prompt"]');
            promptBox.classList.remove('show');
            setTimeout(() => {
                if (promptStyle) promptStyle.remove();
                promptBox.remove();
            }, 300);
            console.log("Content script: Purpose prompt cleared.");
        }
    }


    // Main listener for messages from the extension's popup or background script.
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Explicitly set _currentTabId from the message sender's tab ID.
        // This ensures it's always available when content.js receives a message.
        if (sender.tab && sender.tab.id) {
            _currentTabId = sender.tab.id;
        } else if (request.tabId) { // Fallback to request.tabId if sender.tab.id is not directly available
            _currentTabId = request.tabId;
        }
        const determinedTabId = _currentTabId; // Use the now reliably set _currentTabId
        console.log(`Content script: Message received. Action: ${request.action}, Determined tabId: ${determinedTabId}, Stored _currentTabId: ${_currentTabId}`);


        if (request.action === "toggleReaderMode") {
            toggleReaderMode();
            sendResponse({ status: "Reader mode toggled" });
        } else if (request.action === "extractContent") {
            console.log("Content script: Handling 'extractContent' action.");
            try {
                const content = extractMainContent();
                if (content) {
                    console.log("Content script: Successfully extracted content for analyzeContent. Length:", content.length);
                    chrome.runtime.sendMessage({ action: "analyzeContent", content: content, tabId: determinedTabId });
                    sendResponse({ status: "Content sent for analysis" });
                } else {
                    console.warn("Content script: extractMainContent returned null for analyzeContent. Sending extractionFailed.");
                    chrome.runtime.sendMessage({ action: "extractionFailed", tabId: determinedTabId, error: "No significant content found on the page." });
                    sendResponse({ status: "Content extraction failed" });
                }
            }
            catch (e) {
                console.error("Content script: Critical error during extractMainContent for analyzeContent:", e);
                chrome.runtime.sendMessage({ action: "extractionFailed", error: e.message, tabId: determinedTabId });
                sendResponse({ status: `Content extraction failed with error: ${e.message}` });
            }
        } else if (request.action === "askAiQuestion") {
            console.log("Content script: Handling 'askAiQuestion' action.");
            if (request.isSimpleExplanationRequest) {
                console.log("Content script: Forwarding simple explanation request to background.");
                chrome.runtime.sendMessage({ action: "askAiQuestion", question: request.question, tabId: determinedTabId, isSimpleExplanationRequest: true });
                sendResponse({ status: "Simple explanation question sent to AI." });
            } else {
                try {
                    const content = extractMainContent();
                    if (content) {
                        console.log("Content script: Successfully extracted content for askAiQuestion. Length:", content.length);
                        chrome.runtime.sendMessage({ action: "askAiQuestion", question: request.question, content: content, tabId: determinedTabId });
                        sendResponse({ status: "Question sent to AI." });
                    } else {
                        console.warn("Content script: extractMainContent returned null for askAiQuestion. Sending aiQuestionAnswer with error.");
                        chrome.runtime.sendMessage({ action: "aiQuestionAnswer", answer: "Could not extract page content to answer your question.", tabId: determinedTabId });
                        sendResponse({ status: "Content extraction failed for question." });
                    }
                }
                catch (e) {
                    console.error("Content script: Critical error during extractMainContent for askAiQuestion:", e);
                    chrome.runtime.sendMessage({ action: "aiQuestionAnswer", answer: `Error extracting page content: ${e.message}`, tabId: determinedTabId });
                    sendResponse({ status: `Content extraction failed with error: ${e.message}` });
                }
            }
        } else if (request.action === "displayAiAugmentation") {
            console.log("Content script: Handling 'displayAiAugmentation' action.");
            displayAiAugmentation(request.summary, request.suggestedAction, request.originalLanguage);
            sendResponse({ status: "AI augmentation displayed" });
        } else if (request.action === "displaySimpleExplanationResponse") {
            console.log("Content script: Received 'displaySimpleExplanationResponse' action.");
            displaySimpleExplanation(request.explanation);
            sendResponse({ status: "Simple explanation displayed." });
        } else if (request.action === "displayShoppingListResponse") {
            console.log("Content script: Received 'displayShoppingListResponse' action.");
            if (request.error) {
                showTemporaryMessage(request.error, 'error');
                console.error("Content script: Shopping list error:", request.error);
            } else {
                displayShoppingList(request.shoppingList);
            }
            sendResponse({ status: "Shopping list displayed." });
        } else if (request.action === "displayTranslatedSummaryResponse") {
            console.log("Content script: Received 'displayTranslatedSummaryResponse' action.");
            if (request.error) {
                showTemporaryMessage(request.error, 'error');
                console.error("Content script: Translation error:", request.error);
            } else {
                displayTranslatedSummary(request.translatedText);
            }
            sendResponse({ status: "Translated summary displayed." });
        } else if (request.action === "displayCalendarEventResponse") {
            console.log("Content script: Received 'displayCalendarEventResponse' action.");
            if (request.error) {
                showTemporaryMessage(request.error, 'error');
                console.error("Content script: Calendar event error:", request.error);
            } else {
                displayCalendarEvent(request.eventData);
            }
            sendResponse({ status: "Calendar event displayed." });
        } else if (request.action === "displaySelectedTextSummary") {
            console.log("Content script: Received 'displaySelectedTextSummary' action.");
            if (request.error) {
                showTemporaryMessage(request.error, 'error');
                console.error("Content script: Selected text summary error:", request.error);
            } else {
                displaySelectedTextSummary(request.summary);
            }
            sendResponse({ status: "Selected text summary displayed." });
        } else if (request.action === "displayImageDescriptionResponse") {
            console.log("Content script: Received 'displayImageDescriptionResponse' action.");
            if (request.error) {
                showTemporaryMessage(request.error, 'error');
                console.error("Content script: Image description error:", request.error);
            } else {
                displayImageDescription(request.description);
            }
            sendResponse({ status: "Image description displayed." });
        } else if (request.action === "displayQuizResponse") {
            console.log("Content script: Received 'displayQuizResponse' action.");
            if (request.error) {
                showTemporaryMessage(request.error, 'error');
                console.error("Content script: Quiz error:", request.error);
            } else {
                displayQuiz(request.quizData);
            }
            sendResponse({ status: "Quiz displayed." });
        } else if (request.action === "updateLoadingStatus") {
            console.log("Content script: Received 'updateLoadingStatus' action.");
            showTemporaryMessage(request.message, 'info');
            sendResponse({ status: "Loading status displayed." });
        } else if (request.action === "apiError") {
            console.log("Content script: Received 'apiError' action.");
            showTemporaryMessage(request.message, 'error');
            sendResponse({ status: "API error displayed." });
        } else if (request.action === "extractContentForQuiz") {
            console.log("Content script: Responding to 'extractContentForQuiz' request.");
            const content = extractMainContent();
            sendResponse({ content: content });
            return true;
        } else if (request.action === "extractFullPageContent") {
            console.log("Content script: Responding to 'extractFullPageContent' request.");
            const content = extractMainContent();
            sendResponse({ content: content });
            return true;
        }
        else if (request.action === "promptForLanguageAndTranslate") {
            console.log("Content script: Received 'promptForLanguageAndTranslate' action.");
            promptForLanguageAndTranslate();
            sendResponse({ status: "Language prompt displayed." });
        }
        else if (request.action === "displayTranslatedPageContent") {
            console.log("Content script: Received 'displayTranslatedPageContent' action.");
            if (request.error) {
                showTemporaryMessage(request.error, 'error');
                console.error("Content script: Page translation error:", request.error);
            } else {
                displayTranslatedPageContent(request.translatedText);
            }
            sendResponse({ status: "Translated page content displayed." });
        }
        // --- NEW: Productivity Feature Message Handlers ---
        else if (request.action === "displayPurposePrompt") {
            console.log("Content script: Received 'displayPurposePrompt' action.");
            displayPurposePrompt(request.question);
            sendResponse({ status: "Purpose prompt displayed." });
        } else if (request.action === "clearPurposePrompt") {
            console.log("Content script: Received 'clearPurposePrompt' action.");
            clearPurposePrompt();
            sendResponse({ status: "Purpose prompt cleared." });
        } else if (request.action === "displayWorkDonePrompt") {
            console.log("Content script: Received 'displayWorkDonePrompt' action.");
            displayWorkDonePrompt(request.question);
            sendResponse({ status: "Work done prompt displayed." });
        }
    });


    // Add observer to handle SPA (single-page app) navigations:
(function setupSPAWatcher() {
  let lastHostname = window.location.hostname;
  setInterval(() => {
    if (window.location.hostname !== lastHostname) {
      lastHostname = window.location.hostname;
      // Notify background to possibly re-inject
      chrome.runtime.sendMessage({ action: "spaNavigation", url: window.location.href });
    }
  }, 1500); // Checks every 1.5 seconds
})();

function createOverlay(html, onSubmit) {
  removeOverlay(); // Ensure only one overlay

  const overlay = document.createElement("div");
  overlay.style = `
    position:fixed; z-index:999999;top:0;left:0;width:100vw;height:100vh;
    background:rgba(0,0,0,0.58);display:flex;justify-content:center;align-items:center;
  `;
  overlay.innerHTML = `
    <div style="background:white;padding:28px 32px;border-radius:10px;max-width:90vw;box-shadow:0 4px 42px 0 rgba(0,0,0,0.3)">
      ${html}
      <div style="margin-top:20px;text-align:right;">
        <button id="aiwebaugmentor-submit" style="margin-right:6px">Submit</button>
        <button id="aiwebaugmentor-cancel">Cancel</button>
      </div>
    </div>
  `;
  overlay.querySelector("#aiwebaugmentor-submit").onclick = () => {
    const purposeVal = overlay.querySelector("#aiwebaugmentor-input")?.value || null;
    onSubmit(purposeVal);
    removeOverlay();
  };
  overlay.querySelector("#aiwebaugmentor-cancel").onclick = removeOverlay;

  document.body.appendChild(overlay);
  activeOverlay = overlay;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;

  if (msg.action === "displayPurposePrompt") {
    createOverlay(
      `<div style="font-size:22px;font-weight:600;margin-bottom:13px">What is your purpose for visiting this site?</div>
       <input id="aiwebaugmentor-input" type="text" style="width:94%;font-size:17px;padding:7px 8px;border-radius:6px;border:1px solid #e3e5ee">`,
      (purposeVal) => {
        chrome.runtime.sendMessage({ action: "submitPurpose", purpose: purposeVal });
      }
    );
    sendResponse && sendResponse({ shown: true });
    return true;
  }

  if (msg.action === "displayWorkDonePrompt") {
    createOverlay(
      `<div style="font-size:22px;font-weight:600;margin-bottom:17px;">Did you finish your purpose for visiting this site?</div>
       <div>
        <label style="font-size:18px;">
          <input id="aiwebaugmentor-input" type="checkbox" value="yes"> Yes!
        </label>
       </div>`,
      () => {
        chrome.runtime.sendMessage({ action: "workDoneSubmitted" });
      }
    );
    sendResponse && sendResponse({ shown: true });
    return true;
  }
});

// Remove overlays if navigation occurs (best effort for SPA nav)
window.addEventListener('beforeunload', removeOverlay);

// Optional: ESC to close overlay
document.addEventListener('keydown', (e) => {
  if (e.key === "Escape" && activeOverlay) {
    removeOverlay();
  }
});


})(); // End of IIFE
