const overlayId = 'ai-web-augmenter-overlay';

function ensureOverlay() {
  let overlay = document.getElementById(overlayId);
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;max-width:420px;width:calc(100vw - 40px);font-family:system-ui,sans-serif;';
  document.body.appendChild(overlay);
  return overlay;
}

function renderPanel(title, payload) {
  const overlay = ensureOverlay();
  overlay.innerHTML = `
    <div style="background:#0f172a;color:#e2e8f0;border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 90px rgba(0,0,0,.45);border-radius:20px;padding:16px;backdrop-filter:blur(14px)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px">
        <strong style="font-size:14px">${title}</strong>
        <button id="awt-close" style="background:transparent;color:#94a3b8;border:0;font-size:18px;cursor:pointer">×</button>
      </div>
      <pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.6;margin:0;max-height:50vh;overflow:auto">${JSON.stringify(payload, null, 2)}</pre>
    </div>
  `;
  overlay.querySelector('#awt-close')?.addEventListener('click', () => overlay.remove());
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'AI_WEB_AUGMENTER_SUMMARY') {
    renderPanel('Page Summary', message.payload);
  }
  if (message?.type === 'AI_WEB_AUGMENTER_QA') {
    renderPanel('Answer', message.payload);
  }
  if (message?.type === 'AI_WEB_AUGMENTER_NOTES') {
    renderPanel('Notes', message.payload);
  }
});