document.addEventListener('DOMContentLoaded', async () => {
    const toggleReaderModeButton = document.getElementById('toggleReaderMode');
    const analyzePageButton      = document.getElementById('analyzePage');
    const statusMessage          = document.getElementById('statusMessage');
    const productivityStatus     = document.getElementById('productivityStatus');
    const questionInput          = document.getElementById('questionInput');
    const askAiButton            = document.getElementById('askAiButton');
    const chatHistoryContainer   = document.getElementById('chatHistoryContainer');
    const loadingFeedback        = document.getElementById('loadingFeedback');
    const loadingStatusText      = document.getElementById('loadingStatusText');
    const clearChatButton        = document.getElementById('clearChatButton');

    function showLoading(message = "Processing...") {
        loadingStatusText.textContent = message;
        loadingFeedback.classList.remove('hidden');
        askAiButton.disabled = true;
        analyzePageButton.disabled = true;
    }
    function hideLoading() {
        loadingFeedback.classList.add('hidden');
        askAiButton.disabled = false;
        analyzePageButton.disabled = false;
    }

    function showProductivityStatus(message) {
        productivityStatus.textContent = message;
        productivityStatus.classList.remove('hidden');
    }
    function hideProductivityStatus() {
        productivityStatus.textContent = '';
        productivityStatus.classList.add('hidden');
    }

    async function checkProductivityOverlay(tabId) {
        try {
            const [result] = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    if (document.getElementById('ai-augmenter-purpose-prompt')) {
                        return 'purpose';
                    } else if (document.getElementById('ai-augmenter-work-done-prompt')) {
                        return 'workdone';
                    }
                    return '';
                }
            });
            if (result.result === 'purpose') {
                showProductivityStatus("Purpose prompt is active on this page.");
            } else if (result.result === 'workdone') {
                showProductivityStatus("Work-done check is active on this page.");
            } else {
                hideProductivityStatus();
            }
        } catch (e) {
            // Permission or content script not yet injected
            hideProductivityStatus();
        }
    }

    async function getActiveTabId() {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab ? tab.id : null;
    }

    function addMessageToChatHistory(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `p-2 my-1 rounded-lg max-w-[90%] text-wrap break-words` +
            (role === 'user'
                ? ' bg-blue-100 text-blue-800 self-end ml-auto'
                : ' bg-gray-200 text-gray-800 self-start mr-auto');
        msgDiv.textContent = text;
        chatHistoryContainer.appendChild(msgDiv);
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    }

    async function loadChatHistory(tabId) {
        const result = await chrome.storage.local.get([`chatHistory_${tabId}`]);
        const chatHistory = result[`chatHistory_${tabId}`] || [];
        chatHistoryContainer.innerHTML = '';
        const displayHistory = chatHistory.filter(msg =>
            !(msg.role === 'user' && msg.parts[0].text.startsWith('Analyze this page:'))
        );
        displayHistory.forEach(msg =>
            msg.parts && msg.parts[0] && msg.parts[0].text &&
            addMessageToChatHistory(msg.role, msg.parts[0].text)
        );
    }
    async function clearChatHistory(tabId) {
        await chrome.storage.local.set({ [`chatHistory_${tabId}`]: [] });
        chatHistoryContainer.innerHTML = '';
        statusMessage.textContent = "Chat history cleared.";
    }

    async function injectAndSendMessage(tabId, message) {
        try {
            await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
            if (message.action === "analyzeContent") {
                setTimeout(() => chrome.tabs.sendMessage(tabId, message), 200);
            } else {
                chrome.tabs.sendMessage(tabId, message);
            }
            return true;
        } catch (e) {
            statusMessage.textContent = `Error: ${e.message}`;
            hideLoading();
            return false;
        }
    }

    const tabId = await getActiveTabId();
    if (tabId) {
        await loadChatHistory(tabId);
        checkProductivityOverlay(tabId);
    }

    toggleReaderModeButton.addEventListener('click', async () => {
        const tid = await getActiveTabId();
        if (tid) injectAndSendMessage(tid, { action: "toggleReaderMode", tabId: tid });
    });

    analyzePageButton.addEventListener('click', async () => {
        showLoading("Extracting content…");
        const tid = await getActiveTabId();
        if (tid) {
            chatHistoryContainer.innerHTML = '';
            injectAndSendMessage(tid, { action: "extractContent", tabId: tid });
        } else {
            statusMessage.textContent = "No active tab found.";
            hideLoading();
        }
    });

    askAiButton.addEventListener('click', async () => {
        const question = questionInput.value.trim();
        if (!question) return addMessageToChatHistory('ai', "Please enter a question.");
        addMessageToChatHistory('user', question);
        questionInput.value = '';
        showLoading("Generating response…");
        const tid = await getActiveTabId();
        if (tid) {
            injectAndSendMessage(tid, { action: "askAiQuestion", question, tabId: tid });
        } else {
            addMessageToChatHistory('ai', "No active tab found.");
            hideLoading();
        }
    });

    clearChatButton.addEventListener('click', async () => {
        const tid = await getActiveTabId();
        if (tid) await clearChatHistory(tid);
        else statusMessage.textContent = "No active tab found.";
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "aiQuestionAnswer") {
            addMessageToChatHistory('ai', request.answer); hideLoading();
        }
        if (request.action === "apiError") {
            addMessageToChatHistory('ai', `Error: ${request.message}`); hideLoading();
        }
        if (request.action === "updateLoadingStatus") {
            showLoading(request.message);
        }
        if (request.action === "readerModeStatus") {
            statusMessage.textContent = request.status;
        }
        // Productivity-related
        if (request.action === "displayPurposePrompt") {
            showProductivityStatus("Purpose prompt is active on this page.");
        }
        if (request.action === "clearPurposePrompt") {
            hideProductivityStatus();
        }
        if (request.action === "displayWorkDonePrompt") {
            showProductivityStatus("Work-done check is active on this page.");
        }
    });
});
