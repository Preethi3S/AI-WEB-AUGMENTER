async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function readPage(tab) {
  return chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      title: document.title,
      url: location.href,
      text: document.body?.innerText || '',
      selectedText: window.getSelection()?.toString() || ''
    })
  }).then(([result]) => result.result);
}

document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const tokenInput = document.getElementById('token');
  const setStatus = (value) => {
    status.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  };

  const send = async (type, payload) => {
    const response = await chrome.runtime.sendMessage({ type, payload });
    if (!response.ok) throw new Error(response.error);
    return response.data;
  };

  chrome.storage.local.get(['awt_token']).then((result) => {
    tokenInput.value = result.awt_token || '';
  });

  document.getElementById('saveToken').addEventListener('click', async () => {
    await chrome.storage.local.set({ awt_token: tokenInput.value.trim() });
    setStatus('Token saved.');
  });

  document.getElementById('summarize').addEventListener('click', async () => {
    try {
      const tab = await getActiveTab();
      const page = await readPage(tab);
      const data = await send('GET_SUMMARY', page);
      setStatus(data);
    } catch (error) {
      setStatus(error.message);
    }
  });

  document.getElementById('ask').addEventListener('click', async () => {
    try {
      const tab = await getActiveTab();
      const page = await readPage(tab);
      const question = document.getElementById('question').value.trim() || 'What is the main topic of this page?';
      const data = await send('ASK_QUESTION', { ...page, question });
      setStatus(data);
    } catch (error) {
      setStatus(error.message);
    }
  });

  document.getElementById('notes').addEventListener('click', async () => {
    try {
      const tab = await getActiveTab();
      const page = await readPage(tab);
      const data = await send('GET_NOTES', page);
      setStatus(data);
    } catch (error) {
      setStatus(error.message);
    }
  });

  document.getElementById('match').addEventListener('click', async () => {
    try {
      const resumeText = document.getElementById('resume').value.trim();
      const jobText = document.getElementById('job').value.trim();
      const data = await send('MATCH_RESUME', { resumeText, jobText });
      setStatus(data);
    } catch (error) {
      setStatus(error.message);
    }
  });
});