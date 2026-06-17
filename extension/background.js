const API_BASE = 'http://localhost:4000/api';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'summarize-page', title: 'AI Web Augmenter: Summarize page', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'ask-question', title: 'AI Web Augmenter: Ask about page', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'generate-notes', title: 'AI Web Augmenter: Generate notes', contexts: ['page'] });
  });
});

async function getToken() {
  const result = await chrome.storage.local.get(['awt_token']);
  return result.awt_token || '';
}

async function sendToBackend(path, body, method = 'POST') {
  const token = await getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: method === 'GET' ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function getPageContext(tabId) {
  const [{ result: page }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      title: document.title,
      url: location.href,
      text: document.body?.innerText || '',
      selectedText: window.getSelection()?.toString() || ''
    })
  });
  return page;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const context = await getPageContext(tab.id);
  if (info.menuItemId === 'summarize-page') {
    const response = await sendToBackend('/ai/summaries', context);
    chrome.tabs.sendMessage(tab.id, { type: 'AI_WEB_AUGMENTER_SUMMARY', payload: response.data.result });
  }
  if (info.menuItemId === 'ask-question') {
    const response = await sendToBackend('/ai/questions', { ...context, question: 'Summarize the key points from this page.' });
    chrome.tabs.sendMessage(tab.id, { type: 'AI_WEB_AUGMENTER_QA', payload: response.data.result });
  }
  if (info.menuItemId === 'generate-notes') {
    const response = await sendToBackend('/ai/notes', context);
    chrome.tabs.sendMessage(tab.id, { type: 'AI_WEB_AUGMENTER_NOTES', payload: response.data.result });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === 'GET_SUMMARY') {
        const response = await sendToBackend('/ai/summaries', message.payload);
        sendResponse({ ok: true, data: response.data.result });
        return;
      }
      if (message?.type === 'ASK_QUESTION') {
        const response = await sendToBackend('/ai/questions', message.payload);
        sendResponse({ ok: true, data: response.data.result });
        return;
      }
      if (message?.type === 'MATCH_RESUME') {
        const response = await sendToBackend('/ai/match-resume', message.payload);
        sendResponse({ ok: true, data: response.data.result });
        return;
      }
      if (message?.type === 'GET_NOTES') {
        const response = await sendToBackend('/ai/notes', message.payload);
        sendResponse({ ok: true, data: response.data.result });
        return;
      }
      sendResponse({ ok: false, error: 'Unknown message type' });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();
  return true;
});