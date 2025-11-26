// background.js
// This file contains the service worker logic for the AI Web Augmenter extension.
// It handles context menu clicks, communicates with the Gemini API,
// and manages data storage for chat history and page content.
// UPDATED: Enhanced logging, error handling, and robust content script injection for all features.

console.log("BACKGROUND SCRIPT: Starting execution.");

// IMPORTANT: The API key is provided by the user.
// In a production environment, avoid hardcoding API keys directly in client-side code.
// For this Canvas environment, we'll use the provided key.
const apiKey = "AIzaSyCQT4wxkxRMKUszF1GyqNkV2r0Z-veVyvM";
console.log(`BACKGROUND SCRIPT: API Key variable initialized. Key status: ${apiKey ? "SET" : "NOT SET"}`);

// Initialize Firebase (if not already initialized)
// This configuration is provided by the Canvas environment.
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
let app;
let db;
let auth;

// Only initialize Firebase if the config is not empty
if (Object.keys(firebaseConfig).length > 0) {
    importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore-compat.js');

    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore(app);
    auth = firebase.auth(app);

    // Sign in anonymously if no initial auth token is provided
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        auth.signInWithCustomToken(__initial_auth_token)
            .then(() => {
                console.log("Firebase: Signed in with custom token.");
            })
            .catch((error) => {
                console.error("Firebase: Error signing in with custom token:", error);
                // Fallback to anonymous sign-in on error
                auth.signInAnonymously()
                    .then(() => console.log("Firebase: Signed in anonymously as fallback."))
                    .catch(e => console.error("Firebase: Anonymous sign-in failed:", e));
            });
    } else {
        auth.signInAnonymously()
            .then(() => console.log("Firebase: Signed in anonymously."))
            .catch(e => console.error("Firebase: Anonymous sign-in failed:", e));
    }
} else {
    console.warn("Firebase: Firebase config is empty. Firestore will not be available.");
}

// API URLs for Gemini models
const GEMINI_TEXT_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
const GEMINI_IMAGE_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`; // Using 1.5-flash for image understanding too
const IMAGEN_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

// A Set to keep track of tabs where content.js has already been injected.
const InjTab = new Set();

// Helper function to ensure content.js is loaded into a given tab.
async function ensureContentScriptLoaded(tabId) {
    console.log(`ensureContentScriptLoaded: Attempting to ensure content.js for tab ${tabId}.`);
    if (!tabId) {
        console.error("ensureContentScriptLoaded: Invalid tabId provided.");
        return false;
    }

    // Check if the tab is still valid and not a special Chrome page
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.warn(`ensureContentScriptLoaded: Tab ${tabId} is invalid or a restricted page. Cannot inject content script.`);
        return false;
    }

    if (InjTab.has(tabId)) {
        console.log(`ensureContentScriptLoaded: content.js already marked as injected for tab ${tabId}.`);
        return true;
    }

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js'],
            world: 'MAIN' // Ensures script runs in the page's main context
        });
        InjTab.add(tabId);
        console.log(`ensureContentScriptLoaded: content.js successfully injected into tab ${tabId}.`);
        return true;
    } catch (error) {
        console.error(`ensureContentScriptLoaded: Failed to inject content.js into tab ${tabId}:`, error);
        // Inform content script if possible, or show a notification
        try {
            // This message might fail if the script truly couldn't be injected
            chrome.tabs.sendMessage(tabId, { action: "apiError", message: `Cannot run AI functions on this page type (e.g., internal Chrome pages, extension pages).` });
        } catch (msgError) {
            console.error("ensureContentScriptLoaded: Failed to send error message after content script injection failure:", msgError);
        }
        return false;
    }
}

// Helper function to send messages to content script.
// This function will now ensure the content script is loaded before sending.
async function sendMessageToContentScript(tabId, message) {
    if (!tabId) {
        console.error("sendMessageToContentScript: Invalid tabId provided. Message not sent:", message);
        return;
    }

    const scriptLoaded = await ensureContentScriptLoaded(tabId);
    if (scriptLoaded) {
        try {
            await chrome.tabs.sendMessage(tabId, message);
            console.log(`sendMessageToContentScript: Message sent to tab ${tabId}: ${message.action}`);
        } catch (error) {
            console.error(`sendMessageToContentScript: Failed to send message to tab ${tabId}:`, error);
            // This error typically means the tab was closed or the content script crashed.
            // We can clean up the InjTab set here.
            InjTab.delete(tabId);
        }
    } else {
        console.warn(`sendMessageToContentScript: Content script not loaded for tab ${tabId}. Message not sent: ${message.action}`);
        // If it's a critical error (like restricted page), ensure user gets feedback
        if (message.action !== "updateLoadingStatus" && message.action !== "apiError") {
            // Avoid infinite loops if the error message itself can't be sent
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'AI Augmenter Error',
                message: `Could not perform action on this page. It might be a restricted Chrome page or an extension page.`
            });
        }
    }
}

// Helper function to send loading status updates
function sendLoadingStatus(tabId, message) {
    sendMessageToContentScript(tabId, { action: "updateLoadingStatus", message: message });
}

// Helper function to retrieve data from Chrome's local storage for a specific tab.
async function getStoredData(tabId) {
    console.log(`Background: Attempting to get stored data for tabId: ${tabId}`);
    const result = await chrome.storage.local.get([`pageContent_${tabId}`, `chatHistory_${tabId}`]);
    const pageContent = result[`pageContent_${tabId}`] || null;
    const chatHistory = result[`chatHistory_${tabId}`] || [];
    console.log(`Background: Retrieved from storage for tabId ${tabId}: pageContent length = ${pageContent ? pageContent.length : 'null'}, chatHistory length = ${chatHistory.length}`);
    return { pageContent, chatHistory };
}

// Helper function to store data in Chrome's local storage for a specific tab.
async function setStoredData(tabId, pageContent, chatHistory) {
    console.log(`Background: Attempting to set stored data for tabId: ${tabId}`);
    await chrome.storage.local.set({
        [`pageContent_${tabId}`]: pageContent,
        [`chatHistory_${tabId}`]: chatHistory
    });
    console.log(`Background: Set in storage for tabId ${tabId}: pageContent length = ${pageContent ? pageContent.length : 'null'}, chatHistory length = ${chatHistory.length}`);
}

// Helper function to fetch an image from a given URL and convert it to a Base64 Data URL.
async function imageToDataUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting image to data URL:", error);
        throw error;
    }
}


// Event listener for when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(() => {
    console.log("BACKGROUND SCRIPT: onInstalled listener fired.");
    chrome.contextMenus.removeAll(() => {
        console.log("BACKGROUND SCRIPT: Existing context menus removed.");
        chrome.contextMenus.create({
            id: "summarizeSelectedText",
            title: "AI Augmenter: Summarize Selected",
            contexts: ["selection"]
        });
        console.log("Background: Context menu item 'summarizeSelectedText' created.");

        chrome.contextMenus.create({
            id: "describeImage",
            title: "AI Augmenter: Describe Image",
            contexts: ["image"]
        });
        console.log("Background: Context menu item 'describeImage' created.");

        chrome.contextMenus.create({
            id: "generateQuiz",
            title: "AI Augmenter: Generate Quiz",
            contexts: ["page", "selection"]
        });
        console.log("Background: Context menu item 'generateQuiz' created.");

        chrome.contextMenus.create({
            id: "summarizePage",
            title: "AI Augmenter: Summarize Page",
            contexts: ["page"]
        });
        console.log("Background: Context menu item 'summarizePage' created.");

        chrome.contextMenus.create({
            id: "readAloud",
            title: "AI Augmenter: Read Aloud",
            contexts: ["selection", "page"]
        });
        console.log("Background: Context menu item 'readAloud' created.");

        chrome.contextMenus.create({
            id: "stopReading",
            title: "AI Augmenter: Stop Reading",
            contexts: ["page"],
            visible: false
        });
        console.log("Background: Context menu item 'stopReading' created (initially hidden).");

        chrome.contextMenus.create({
            id: "translatePage",
            title: "AI Augmenter: Translate Page",
            contexts: ["page"]
        });
        console.log("Background: Context menu item 'translatePage' created.");
    });
});

// Listener for when a context menu item is clicked.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log("BACKGROUND SCRIPT: onClicked listener fired.");
    const tabId = tab.id;
    console.log(`BACKGROUND SCRIPT: Context menu clicked. MenuItemId: ${info.menuItemId}, TabId: ${tabId}`);

    // The ensureContentScriptLoaded is now handled within sendMessageToContentScript,
    // so we don't need a direct call here for every action.
    // However, for actions that *initiate* a content script interaction,
    // we still need to ensure the script is ready *before* sending the first message.
    // For context menu clicks, the script should generally be ready, but better safe.
    const contentScriptReady = await ensureContentScriptLoaded(tabId);
    if (!contentScriptReady) {
        console.warn(`Background: Content script not ready for tab ${tabId}. Aborting context menu action.`);
        return;
    }


    if (!apiKey) { // Removed the placeholder check as user provided key
        console.error("Background: API Key is not set. Please update background.js with your actual API key.");
        sendMessageToContentScript(tabId, { action: "apiError", message: "API Key not set in background.js. Please update the file." });
        return;
    }

    const apiUrl = GEMINI_TEXT_MODEL_URL; // Using a constant for the URL

    if (info.menuItemId === "summarizeSelectedText" && info.selectionText) {
        const selectedText = info.selectionText;
        console.log(`Background: Summarize Selected Text action. Selected text length: ${selectedText.length}, tabId: ${tabId}`);

        sendLoadingStatus(tabId, "Summarizing selected text...");

        const prompt = `Summarize the following text concisely. Provide only the summary, with no additional commentary or formatting.

        Text to summarize:
        "${selectedText}"
        `;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const result = await response.json();
            let summary = "Could not summarize selected text.";

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                summary = result.candidates[0].content.parts[0].text;
            } else {
                console.warn("Background: Unexpected AI response structure (Summarize Selected):", result);
                summary = "AI could not provide a summary for the selected text.";
            }

            console.log("Background: Summarized Selected Text:", summary);
            sendMessageToContentScript(tabId, { action: "displaySelectedTextSummary", summary: summary });

        } catch (error) {
            console.error("Background: Error calling Gemini API for selected text summary:", error);
            const errorMessage = `Error summarizing selected text: ${error.message}`;
            sendMessageToContentScript(tabId, { action: "displaySelectedTextSummary", error: errorMessage });
        }
    } else if (info.menuItemId === "describeImage" && info.srcUrl) {
        const imageUrl = info.srcUrl;
        console.log(`Background: Describe Image action. Image URL: ${imageUrl}, tabId: ${tabId}`);

        sendLoadingStatus(tabId, "Analyzing image...");

        try {
            const dataUrl = await imageToDataUrl(imageUrl);
            const [mimeTypePart, dataPart] = dataUrl.split(';');
            const mimeType = mimeTypePart.split(':')[1];
            const base64Data = dataPart.split(',')[1];

            if (!base64Data) {
                throw new Error("Could not extract Base64 data from image.");
            }

            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: "Describe this image in detail." },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ]
            };

            const response = await fetch(GEMINI_IMAGE_MODEL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const result = await response.json();
            let description = "Could not describe image.";

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                description = result.candidates[0].content.parts[0].text;
            } else {
                console.warn("Background: Unexpected AI response structure (Describe Image):", result);
                description = "AI could not provide a description for this image.";
            }

            console.log("Background: Image Description:", description);
            sendMessageToContentScript(tabId, { action: "displayImageDescriptionResponse", description: description });

        } catch (error) {
            console.error("Background: Error describing image:", error);
            const errorMessage = `Error describing image: ${error.message}. Please try a different image or ensure it's publicly accessible.`;
            sendMessageToContentScript(tabId, { action: "displayImageDescriptionResponse", error: errorMessage });
        }
    } else if (info.menuItemId === "generateQuiz") {
        console.log(`Background: Generate Quiz action. TabId: ${tabId}`);
        sendLoadingStatus(tabId, "Extracting page content for quiz...");

        const contentToQuiz = info.selectionText || null;

        if (contentToQuiz) {
            console.log(`Background: Using selected text for quiz. Length: ${contentToQuiz.length}`);
            generateQuizFromContent(contentToQuiz, tabId, apiUrl);
        } else {
            // Request content from the content script
            try {
                const response = await chrome.tabs.sendMessage(tabId, { action: "extractContentForQuiz" });
                if (response && response.content) {
                    console.log(`Background: Received content for quiz from content.js. Length: ${response.content.length}`);
                    generateQuizFromContent(response.content, tabId, apiUrl);
                } else {
                    console.warn("Background: No content received from content.js for quiz.");
                    sendMessageToContentScript(tabId, { action: "displayQuizResponse", error: "No content found on the page to generate a quiz." });
                }
            } catch (e) {
                console.error("Error sending extractContentForQuiz message or receiving response:", e);
                sendMessageToContentScript(tabId, { action: "displayQuizResponse", error: `Failed to extract page content: ${e.message}` });
            }
        }
    } else if (info.menuItemId === "summarizePage") {
        console.log(`Background: Summarize Page action. TabId: ${tabId}`);
        sendLoadingStatus(tabId, "Extracting full page content...");

        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: "extractFullPageContent" });
            if (response && response.content) {
                console.log(`Background: Received full page content from content.js. Length: ${response.content.length}`);
                await summarizeFullPageContent(response.content, tabId, apiUrl);
            } else {
                console.warn("Background: No content received from content.js for full page summary.");
                sendMessageToContentScript(tabId, { action: "displayAiAugmentation", summary: "No content found on the page to summarize.", suggestedAction: { text: "No Content", type: "none" }, originalLanguage: "English" });
            }
        } catch (e) {
            console.error("Error sending extractFullPageContent message or receiving response:", e);
            sendMessageToContentScript(tabId, { action: "displayAiAugmentation", summary: `Failed to extract page content: ${e.message}`, suggestedAction: { text: "Error", type: "none" }, originalLanguage: "English" });
        }
    } else if (info.menuItemId === "readAloud") {
        console.log(`Background: Read Aloud action. TabId: ${tabId}`);
        chrome.tts.stop(); // Stop any ongoing speech before starting new one.
        chrome.contextMenus.update("stopReading", { visible: true });

        let textToSpeak = "";
        if (info.selectionText) {
            textToSpeak = info.selectionText;
            console.log(`Background: Reading selected text. Length: ${textToSpeak.length}`);
            sendLoadingStatus(tabId, "Reading selected text aloud...");
            chrome.tts.speak(textToSpeak, {
                onEvent: (event) => {
                    if (event.type === 'end' || event.type === 'error') {
                        console.log(`TTS event: ${event.type}`);
                        chrome.contextMenus.update("stopReading", { visible: false });
                        sendLoadingStatus(tabId, "Read aloud finished.", "success");
                    }
                }
            });
        } else {
            sendLoadingStatus(tabId, "Extracting page content for read aloud...");
            try {
                const response = await chrome.tabs.sendMessage(tabId, { action: "extractFullPageContent" });
                if (response && response.content) {
                    textToSpeak = response.content.substring(0, 1000); // Limit to first 1000 chars for TTS
                    console.log(`Background: Reading full page content (first 1000 chars). Length: ${textToSpeak.length}`);
                    sendLoadingStatus(tabId, "Reading page content aloud...");
                    chrome.tts.speak(textToSpeak, {
                        onEvent: (event) => {
                            if (event.type === 'end' || event.type === 'error') {
                                console.log(`TTS event: ${event.type}`);
                                chrome.contextMenus.update("stopReading", { visible: false });
                                sendLoadingStatus(tabId, "Read aloud finished.", "success");
                            }
                        }
                    });
                } else {
                    console.warn("Background: No content received from content.js for read aloud.");
                    sendMessageToContentScript(tabId, { action: "apiError", message: "No content found on the page to read aloud." });
                    chrome.contextMenus.update("stopReading", { visible: false });
                }
            } catch (e) {
                console.error("Error sending extractFullPageContent message for read aloud:", e);
                sendMessageToContentScript(tabId, { action: "apiError", message: `Failed to get page content for read aloud: ${e.message}` });
                chrome.contextMenus.update("stopReading", { visible: false });
            }
        }
    } else if (info.menuItemId === "stopReading") {
        console.log(`Background: Stop Reading action. TabId: ${tabId}`);
        chrome.tts.stop();
        chrome.contextMenus.update("stopReading", { visible: false });
        sendLoadingStatus(tabId, "Reading stopped.", "info");
    } else if (info.menuItemId === "translatePage") {
        console.log(`Background: Translate Page action. TabId: ${tabId}`);
        // Clear any existing overlays before prompting for language to avoid clutter.
        // This message is sent first, and ensureContentScriptLoaded will handle injection.
        sendMessageToContentScript(tabId, { action: "clearAllAugmenterOverlays" });
        sendMessageToContentScript(tabId, { action: "promptForLanguageAndTranslate" });
    }
});

async function summarizeFullPageContent(content, tabId, apiUrl) {
    console.log("BACKGROUND SCRIPT: summarizeFullPageContent started.");
    if (!content || content.trim() === "") {
        console.warn("Background: No content provided for full page summarization.");
        sendMessageToContentScript(tabId, { action: "displayAiAugmentation", summary: "No content to summarize.", suggestedAction: { text: "No Content", type: "none" }, originalLanguage: "English" });
        return;
    }

    sendLoadingStatus(tabId, "Summarizing page with AI...");

    const prompt = `You are an AI assistant for a web browser extension. Your task is to analyze web page content and suggest the single most useful action a user might want to take, along with a concise summary.

    **Instructions for Action Selection:**
    1.  **Prioritize Specificity:** Choose the most specific and relevant action from the list below.
    2.  **Language Awareness:** Determine the original language of the provided content. If the original language is NOT English, strongly consider "translate_summary" as the \`suggestedActionType\`.
    3.  **Avoid Defaulting:** Do NOT default to "read_more" unless NO other action type is clearly applicable.
    4.  **Output JSON:** Always return a JSON object.

    **Available Action Types and their best use cases:**
    -   **"copy_summary"**:
        * **Use when:** The page provides a clear definition, a concise explanation of a concept, a list of facts, or a useful, self-contained piece of information that a user would likely want to quickly save, copy, or reference.
        * **Example Content:** Dictionary entries, encyclopedia articles (like Wikipedia definitions), "What is X?" articles, summaries of research papers, lists of tips.
        * **Suggested Text:** "Copy Definition", "Copy Key Points", "Copy Summary"
    -   **"web_search"**:
        * **Use when:** The page mentions a specific, notable entity (person, product, company, complex scientific/technical term, historical event, location) that a user might immediately want to research further on the wider web, or find alternatives/more information about.
        * **Example Content:** Product reviews, biographies, news about specific companies/technologies, articles introducing complex concepts.
        * **Suggested Text:** "Search on Google", "Find More Info", "Compare Prices"
    -   **"read_more"**:
        * **Use when:** The page is a general news article, a lengthy blog post, a detailed report, or a story where the primary user intent is to continue reading the original content for deeper understanding. This should be the *least preferred* option if "copy_summary" or "web_search" are applicable.
        * **Example Content:** Long-form journalism, personal essays, general news updates.
        * **Suggested Text:** "Continue Reading", "Read Full Article"
    -   **"explain_in_simple_terms"**:
        * **Use when:** The page contains complex technical, scientific, or academic content that a user might struggle to understand.
        * **Suggested Text:** "Explain Simply", "Simplify This", "Break it Down"
    -   **"generate_shopping_list"**:
        * **Use when:** The page is clearly a recipe with ingredients listed.
        * **Suggested Text:** "Generate Shopping List", "Get Ingredients"
    -   **"translate_summary"**:
        * **Use when:** The original page content is in a foreign language.
        * **Suggested Text:** "Translate to English", "Translate Summary"
    -   **"add_to_calendar"**:
        * **Use when:** The page describes an event with a clear date, time, and title.
        * **Suggested Text:** "Add to Calendar", "Save Event"

    **Return the response as a JSON object with this exact structure:**
    {
        "summary": "A concise summary of the page content (max 100 words).",
        "suggestedActionText": "User-facing text for the action button (e.g., 'Copy Definition', 'Search for Deals').",
        "suggestedActionType": "Internal action type (e.g., 'copy_summary', 'web_search', 'read_more').",
        "originalLanguage": "The detected original language of the page content (e.g., 'English', 'Spanish', 'French')."
    }

    **Content to Analyze:**
    ${content.substring(0, 5000)}
    `;

    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "summary": { "type": "STRING" },
                    "suggestedActionText": { "type": "STRING" },
                    "suggestedActionType": { "type": "STRING" },
                    "originalLanguage": { "type": "STRING" }
                },
                "propertyOrdering": ["summary", "suggestedActionText", "suggestedActionType", "originalLanguage"]
            }
        }
    };

    try {
        console.log("BACKGROUND SCRIPT: Sending full page summary request to Gemini API.");
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        let aiResponseData = {
            summary: "No AI summary.",
            suggestedActionText: "No Action",
            suggestedActionType: "none",
            originalLanguage: "Unknown"
        };

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const jsonString = result.candidates[0].content.parts[0].text;
            console.log("Background: Raw AI JSON Response (Full Page Summary):", jsonString);
            try {
                const parsedJson = JSON.parse(jsonString);
                aiResponseData.summary = parsedJson.summary || aiResponseData.summary;
                aiResponseData.suggestedActionText = parsedJson.suggestedActionText || aiResponseData.suggestedActionText;
                aiResponseData.suggestedActionType = parsedJson.suggestedActionType || aiResponseData.suggestedActionType;
                aiResponseData.originalLanguage = parsedJson.originalLanguage || aiResponseData.originalLanguage;

            } catch (jsonError) {
                console.error("Background: Error parsing AI JSON response (Full Page Summary):", jsonError);
                aiResponseData.summary = "AI response format unexpected (JSON parse error). Raw: " + jsonString.substring(0, 200);
            }
        } else {
            console.warn("Background: Unexpected AI response structure (Full Page Summary): No candidates or content parts.", result);
            aiResponseData.summary = "AI response format unexpected.";
        }

        console.log("Background: Final AI Response Data (Full Page Summary):", aiResponseData);

        sendMessageToContentScript(tabId, {
            action: "displayAiAugmentation",
            summary: aiResponseData.summary,
            suggestedAction: {
                text: aiResponseData.suggestedActionText,
                type: aiResponseData.suggestedActionType
            },
            originalLanguage: aiResponseData.originalLanguage
        });

    } catch (error) {
        console.error("Background: Error calling Gemini API for full page summarization:", error);
        const errorMessage = `Error summarizing page: ${error.message}`;
        sendMessageToContentScript(tabId, { action: "apiError", message: errorMessage });
    }
}

// --- Gemini API Call for Quiz Generation ---
async function generateQuizFromContent(content, tabId, apiUrl) {
    console.log("BACKGROUND SCRIPT: generateQuizFromContent started.");
    if (!content || content.trim() === "") {
        console.warn("Background: No content provided for quiz generation.");
        sendMessageToContentScript(tabId, { action: "displayQuizResponse", error: "No content found to generate a quiz." });
        return;
    }

    sendLoadingStatus(tabId, "Generating quiz with AI...");

    const prompt = `Based on the following text, generate a short, interactive multiple-choice quiz with 3-5 questions. For each question, provide 3-4 options and clearly indicate the correct answer. Format the output as a JSON array of objects, where each object has 'question', 'options' (an array of strings), and 'correctAnswer' (a string matching one of the options).
    Example format:
    [
      {
        "question": "What is the capital of France?",
        "options": ["Berlin", "Madrid", "Paris", "Rome"],
        "correctAnswer": "Paris"
      }
    ]
    Text: ${content}`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        "question": { "type": "STRING" },
                        "options": { "type": "ARRAY", "items": { "type": "STRING" } },
                        "correctAnswer": { "type": "STRING" }
                    },
                    "propertyOrdering": ["question", "options", "correctAnswer"]
                }
            }
        }
    };

    try {
        console.log("BACKGROUND SCRIPT: Sending quiz generation request to Gemini API.");
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const jsonString = result.candidates[0].content.parts[0].text;
            try {
                const quizData = JSON.parse(jsonString);
                sendMessageToContentScript(tabId, { action: "displayQuizResponse", quizData: quizData });
            } catch (parseError) {
                console.error("Background script: Error parsing quiz JSON:", parseError);
                sendMessageToContentScript(tabId, { action: "apiError", message: "AI generated malformed quiz data." });
            }
        } else {
            console.error("Background script: Unexpected API response structure for quiz generation:", result);
            sendMessageToContentScript(tabId, { action: "apiError", message: "AI quiz response empty or malformed." });
        }
    } catch (error) {
        console.error("Background script: Error calling Gemini API for quiz:", error);
        sendMessageToContentScript(tabId, { action: "apiError", message: `Failed to generate quiz: ${error.message}` });
    }
}


// --- Gemini API Call for Page Translation ---
async function callGeminiApiForPageTranslation(tabId, content, targetLanguage) {
    console.log("BACKGROUND SCRIPT: callGeminiApiForPageTranslation started.");
    if (!content || content.trim() === "") {
        console.warn("Background: No content provided for page translation.");
        sendMessageToContentScript(tabId, { action: "displayTranslatedPageContent", error: "No content found to translate." });
        return;
    }

    sendLoadingStatus(tabId, `Translating page to ${targetLanguage} with AI...`);

    const prompt = `Translate the following web page content into ${targetLanguage}. Maintain the original formatting (paragraphs, lists, etc.) as much as possible, using HTML tags where appropriate.
    Content to translate:
    ${content}`;

    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    try {
        console.log("BACKGROUND SCRIPT: Sending page translation request to Gemini API.");
        const response = await fetch(GEMINI_TEXT_MODEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const translatedText = result.candidates[0].content.parts[0].text;
            sendMessageToContentScript(tabId, { action: "displayTranslatedPageContent", translatedText: translatedText });
        } else {
            console.error("Background script: Unexpected API response structure for page translation:", result);
            sendMessageToContentScript(tabId, { action: "apiError", message: "AI translation response empty or malformed." });
        }
    } catch (error) {
        console.error("Background script: Error calling Gemini API for page translation:", error);
        sendMessageToContentScript(tabId, { action: "apiError", message: `Failed to translate page: ${error.message}` });
    }
}


// --- Gemini API Call for Shopping List Generation ---
async function callGeminiApiForShoppingList(tabId, content) {
    console.log("BACKGROUND SCRIPT: callGeminiApiForShoppingList started.");
    if (!content || content.trim() === "") {
        console.warn("Background: No content provided for shopping list generation.");
        sendMessageToContentScript(tabId, { action: "displayShoppingListResponse", error: "No content found to generate a shopping list." });
        return;
    }

    sendLoadingStatus(tabId, "Generating shopping list with AI...");

    const prompt = `Extract a shopping list of ingredients from the following text. Respond with a JSON array of strings, where each string is an ingredient. If no ingredients are found, return an empty array.
    Example: ["1 cup flour", "2 eggs", "1/2 cup sugar"]
    Text: ${content}`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: { "type": "STRING" }
            }
        }
    };

    try {
        console.log("BACKGROUND SCRIPT: Sending shopping list generation request to Gemini API.");
        const response = await fetch(GEMINI_TEXT_MODEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const jsonString = result.candidates[0].content.parts[0].text;
            try {
                const shoppingList = JSON.parse(jsonString);
                sendMessageToContentScript(tabId, { action: "displayShoppingListResponse", shoppingList: shoppingList });
            } catch (parseError) {
                console.error("Background script: Error parsing shopping list JSON:", parseError);
                sendMessageToContentScript(tabId, { action: "apiError", message: "AI generated malformed shopping list data." });
            }
        } else {
            console.error("Background script: Unexpected API response structure for shopping list:", result);
            sendMessageToContentScript(tabId, { action: "apiError", message: "AI shopping list response empty or malformed." });
        }
    } catch (error) {
        console.error("Background script: Error calling Gemini API for shopping list:", error);
        sendMessageToContentScript(tabId, { action: "apiError", message: `Failed to generate shopping list: ${error.message}` });
    }
}

// --- Gemini API Call for Calendar Event Generation ---
async function callGeminiApiForCalendarEvent(tabId, content) {
    console.log("BACKGROUND SCRIPT: callGeminiApiForCalendarEvent started.");
    if (!content || content.trim() === "") {
        console.warn("Background: No content provided for calendar event generation.");
        sendMessageToContentScript(tabId, { action: "displayCalendarEventResponse", error: "No content found to generate a calendar event." });
        return;
    }

    sendLoadingStatus(tabId, "Extracting event details with AI...");

    const prompt = `Extract event details (title, start time, end time, location, description) from the following text. Respond with a JSON object. If a field is not found, use null. Times should be in ISO 8601 format (e.g., "2023-10-27T10:00:00Z").
    Example: {"title": "Team Meeting", "startTime": "2023-10-27T10:00:00Z", "endTime": "2023-10-27T11:00:00Z", "location": "Conference Room A", "description": "Discuss Q4 strategy"}
    Text: ${content}`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "title": { "type": "STRING", "nullable": true },
                    "startTime": { "type": "STRING", "nullable": true },
                    "endTime": { "type": "STRING", "nullable": true },
                    "location": { "type": "STRING", "nullable": true },
                    "description": { "type": "STRING", "nullable": true }
                },
                "propertyOrdering": ["title", "startTime", "endTime", "location", "description"]
            }
        }
    };

    try {
        console.log("BACKGROUND SCRIPT: Sending calendar event generation request to Gemini API.");
        const response = await fetch(GEMINI_TEXT_MODEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const jsonString = result.candidates[0].content.parts[0].text;
            try {
                const eventData = JSON.parse(jsonString);
                sendMessageToContentScript(tabId, { action: "displayCalendarEventResponse", eventData: eventData });
            } catch (parseError) {
                console.error("Background script: Error parsing calendar event JSON:", parseError);
                sendMessageToContentScript(tabId, { action: "apiError", message: "AI generated malformed event data." });
            }
        } else {
            console.error("Background script: Unexpected API response structure for calendar event:", result);
            sendMessageToContentScript(tabId, { action: "apiError", message: "AI event response empty or malformed." });
        }
    } catch (error) {
        console.error("Background script: Error calling Gemini API for calendar event:", error);
        sendMessageToContentScript(tabId, { action: "apiError", message: `Failed to generate calendar event: ${error.message}` });
    }
}


// --- Main Message Listener from Content Scripts and Popup ---
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const tabId = sender.tab ? sender.tab.id : request.tabId; // Ensure we always have a tabId

    if (!tabId) {
        console.error("Background script: Received message without a valid tab ID.", request);
        return; // Cannot proceed without a tab ID
    }

    console.log(`Background script: Message received from tab ${tabId}. Action: ${request.action}`);

    if (request.action === "analyzeContent") {
        sendLoadingStatus(tabId, "Analyzing page content...");
        // Call to Gemini API for analysis and suggested action
        const prompt = `Summarize the main topic of this page and suggest one primary action a user might want to take based on the content (e.g., 'read_more', 'copy_summary', 'web_search', 'explain_in_simple_terms', 'generate_shopping_list', 'translate_summary', 'add_to_calendar'). Provide the response as a JSON object with 'summary', 'suggestedAction' (object with 'text' and 'type'), and 'originalLanguage' (e.g., 'English', 'French').
        Example: {"summary": "This page is about quantum physics...", "suggestedAction": {"text": "Explain in simple terms", "type": "explain_in_simple_terms"}, "originalLanguage": "English"}
        Content: ${request.content}`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "summary": { "type": "STRING" },
                        "suggestedAction": {
                            "type": "OBJECT",
                            "properties": {
                                "text": { "type": "STRING" },
                                "type": { "type": "STRING" }
                            }
                        },
                        "originalLanguage": { "type": "STRING" }
                    },
                    "propertyOrdering": ["summary", "suggestedAction", "originalLanguage"]
                }
            }
        };

        try {
            const response = await fetch(GEMINI_TEXT_MODEL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const jsonString = result.candidates[0].content.parts[0].text;
                try {
                    const parsedJson = JSON.parse(jsonString);
                    sendMessageToContentScript(tabId, {
                        action: "displayAiAugmentation",
                        summary: parsedJson.summary,
                        suggestedAction: parsedJson.suggestedAction,
                        originalLanguage: parsedJson.originalLanguage
                    });
                } catch (parseError) {
                    console.error("Background script: Error parsing AI response for analyzeContent:", parseError);
                    sendMessageToContentScript(tabId, { action: "apiError", message: "AI response malformed for analysis." });
                }
            } else {
                console.error("Background script: Unexpected API response structure for analyzeContent:", result);
                sendMessageToContentScript(tabId, { action: "apiError", message: "AI analysis response empty or malformed." });
            }
        } catch (error) {
            console.error("Background script: Error calling Gemini API for analyzeContent:", error);
            sendMessageToContentScript(tabId, { action: "apiError", message: `Failed to analyze content: ${error.message}` });
        }


    } else if (request.action === "askAiQuestion") {
        sendLoadingStatus(tabId, "Asking AI...");
        if (request.isSimpleExplanationRequest) {
            // This is handled via a direct text call, not structured JSON
            const prompt = `Explain this in simple terms: "${request.question}"`;
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            try {
                const response = await fetch(GEMINI_TEXT_MODEL_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const explanation = result.candidates[0].content.parts[0].text;
                    sendMessageToContentScript(tabId, { action: "displaySimpleExplanationResponse", explanation: explanation });
                } else {
                    console.error("Background script: Unexpected AI response for simple explanation:", result);
                    sendMessageToContentScript(tabId, { action: "apiError", message: "AI explanation empty or malformed." });
                }
            } catch (error) {
                console.error("Background script: Error calling Gemini API for simple explanation:", error);
                sendMessageToContentScript(tabId, { action: "apiError", message: `Failed to get AI explanation: ${error.message}` });
            }
        } else {
            // This is for general questions based on page content
            const prompt = `Based on the following content, answer this question: "${request.question}"\n\nContent: ${request.content}`;
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            try {
                const response = await fetch(GEMINI_TEXT_MODEL_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    const answer = result.candidates[0].content.parts[0].text;
                    sendMessageToContentScript(tabId, { action: "aiQuestionAnswer", answer: answer });
                } else {
                    console.error("Background script: Unexpected AI response for general question:", result);
                    sendMessageToContentScript(tabId, { action: "apiError", message: "AI answer empty or malformed." });
                }
            } catch (error) {
                console.error("Background script: Error calling Gemini API for general question:", error);
                sendMessageToContentScript(tabId, { action: "apiError", message: `Failed to get AI answer: ${error.message}` });
            }
        }
    } else if (request.action === "generateShoppingList") {
        sendLoadingStatus(tabId, "Generating shopping list...");
        callGeminiApiForShoppingList(tabId, request.content);
    } else if (request.action === "translateSummary") {
        sendLoadingStatus(tabId, `Translating summary to ${request.targetLanguage}...`);
        // This is handled via a direct text call, not structured JSON
        const prompt = `Translate the following summary into ${request.targetLanguage}: "${request.summaryText}"`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        try {
            const response = await fetch(GEMINI_TEXT_MODEL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const translatedText = result.candidates[0].content.parts[0].text;
                sendMessageToContentScript(tabId, { action: "displayTranslatedSummaryResponse", translatedText: translatedText });
            } else {
                console.error("Background script: Unexpected AI response for summary translation:", result);
                sendMessageToContentScript(tabId, { action: "apiError", message: "AI summary translation empty or malformed." });
            }
        } catch (error) {
            console.error("Background script: Error calling Gemini API for summary translation:", error);
            sendMessageToContentScript(tabId, { action: "apiError", message: `Failed to translate summary: ${error.message}` });
        }
    } else if (request.action === "addToCalendar") {
        sendLoadingStatus(tabId, "Extracting event details...");
        callGeminiApiForCalendarEvent(tabId, request.content);
    } else if (request.action === "extractionFailed") {
        console.warn(`Background script: Content extraction failed for tab ${tabId}. Error: ${request.error || 'Unknown'}`);
        sendMessageToContentScript(tabId, { action: "apiError", message: `Content extraction failed: ${request.error || 'No content found.'}` });
    } else if (request.action === "translatePageContent") {
        sendLoadingStatus(tabId, `Translating entire page to ${request.targetLanguage}...`);
        callGeminiApiForPageTranslation(tabId, request.content, request.targetLanguage);
    }
    // --- Productivity Feature Actions ---
    else if (request.action === "submitPurpose") {
        console.log(`Background script: User submitted purpose for tab ${tabId}: ${request.purpose}`);
        // Here, we would store the purpose and set an alarm for the follow-up.
        // For now, just acknowledge and clear the prompt.
        sendMessageToContentScript(tabId, { action: "clearPurposePrompt" });
        // Schedule the follow-up check (e.g., in 5 minutes)
        const checkInTime = Date.now() + (5 * 60 * 1000); // 5 minutes from now
        chrome.alarms.create(`productivity_check_${tabId}`, { when: checkInTime });
        console.log(`Background script: Scheduled productivity check-in for tab ${tabId} at ${new Date(checkInTime).toLocaleString()}`);
    } else if (request.action === "cancelPurposePrompt") {
        console.log(`Background script: User cancelled purpose prompt for tab ${tabId}.`);
        // Clear any associated alarms if they were set upon showing the prompt
        chrome.alarms.clear(`productivity_check_${tabId}`);
    } else if (request.action === "workDoneResponse") {
        console.log(`Background script: User responded to work done prompt for tab ${tabId}: ${request.response}`);
        // Optionally, store this response or take further action
        // For now, no specific action needed beyond logging and prompt dismissal handled by content.js
        // No need to send message back, content script handles its own dismissal.
    }
});

// Map to keep track of which tabs have an active purpose prompt displayed
const DISTRACTING_SITES = [
  "youtube.com",
  "facebook.com",
  "twitter.com",
  "instagram.com",
  // add more
];

const activePurposePrompts = new Map(); // tabId -> { hostname, status }
const injectedTabs = new Set();

function isDistractingSite(urlString) {
  try {
    const hostname = new URL(urlString).hostname || "";
    return DISTRACTING_SITES.some(site => hostname.includes(site));
  } catch (e) {
    return false;
  }
}

async function ensureContentScript(tabId) {
  if (injectedTabs.has(tabId)) return true;
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ["content.js"],
    });
    injectedTabs.add(tabId);
    console.log(`[BG] Content script injected into tab ${tabId}`);
    return true;
  } catch (e) {
    console.warn(`[BG] Could not inject content-script into tab ${tabId}`, e);
    return false;
  }
}

// Send a message and ensure the content script is injected first
async function sendMessageToContent(tabId, message) {
  const injected = await ensureContentScript(tabId);
  if (!injected) return false;
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch (err) {
    // SendMessage may fail if page has changed/unreachable
    console.warn(`[BG] Message failed for tab ${tabId}:`, message, err);
    injectedTabs.delete(tabId);
    return false;
  }
}

async function maybeShowPrompt(tabId, url) {
  // Avoid duplicates; clear/refresh state if URL changed
  if (!isDistractingSite(url)) {
    activePurposePrompts.delete(tabId);
    return;
  }

  const state = activePurposePrompts.get(tabId);
  if (state && state.status === "active" && state.hostname === new URL(url).hostname) {
    // Already shown for this hostname in this tab
    return;
  }

  // Reset state for new site/hostname
  activePurposePrompts.set(tabId, { hostname: new URL(url).hostname, status: "active" });

  // Send purpose prompt
  const sent = await sendMessageToContent(tabId, { action: "displayPurposePrompt" });
  if (!sent) {
    // can't notify user on page, maybe fallback to notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title: "Focus Prompt",
      message: "Couldn't display purpose overlay on this page.",
    });
    activePurposePrompts.delete(tabId);
    return;
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  console.log("[BG] Tab updated", tabId, tab.url);
  maybeShowPrompt(tabId, tab.url);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  activePurposePrompts.delete(tabId);
  injectedTabs.delete(tabId);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, tab => {
    if (tab && tab.url) {
      maybeShowPrompt(tabId, tab.url);
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = (sender.tab && sender.tab.id) || msg.tabId;
  if (!tabId) return;

  if (msg.action === "submitPurpose") {
    // Purpose received; schedule follow-up in 5min
    chrome.alarms.create(`checkin_${tabId}`, { delayInMinutes: 5 });
    activePurposePrompts.set(tabId, { ...activePurposePrompts.get(tabId), status: "purpose_entered" });
    sendResponse({ success: true });
    return;
  }

  if (msg.action === "overlayClosed") {
    // Overlay closed—reset state for this tab
    console.log(`[BG] Overlay closed, resetting state for tab ${tabId}`);
    activePurposePrompts.delete(tabId);
    sendResponse({ success: true });
    return;
  }

  if (msg.action === "workDoneSubmitted") {
    // Work completion prompt dealt with, clear state
    activePurposePrompts.delete(tabId);
    sendResponse({ success: true });
    return;
  }
});

// Handle overlay after alarm triggers (check-in after 5min)
chrome.alarms.onAlarm.addListener(alarm => {
  const match = alarm.name.match(/^checkin_(\d+)$/);
  if (!match) return;
  const tabId = parseInt(match[1], 10);
  const state = activePurposePrompts.get(tabId);
  if (!state || state.status !== "purpose_entered") return;

  chrome.tabs.get(tabId, tab => {
    if (!tab || !isDistractingSite(tab.url)) {
      activePurposePrompts.delete(tabId); // User left the distracting site
      return;
    }
    sendMessageToContent(tabId, { action: "displayWorkDonePrompt" });
  });
});
