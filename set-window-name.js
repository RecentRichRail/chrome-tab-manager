// Handles saving or skipping the window label from the prompt page

function getQueryParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

async function saveLabel(windowId, label) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'setWindowLabel', windowId: String(windowId), label: label || '' }, (resp) => {
      resolve(resp);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const windowId = getQueryParam('windowId');
  const labelInput = document.getElementById('labelInput');
  const saveBtn = document.getElementById('saveBtn');
  const skipBtn = document.getElementById('skipBtn');
  const openPopupLink = document.getElementById('openPopupLink');

  // focus input
  labelInput.focus();

  saveBtn.addEventListener('click', async () => {
    const label = labelInput.value.trim();
    try {
      await saveLabel(windowId, label);
      // Refocus the created window after save
      chrome.runtime.sendMessage({ type: 'focusWindow', windowId: String(windowId) }, () => {});
    } catch (e) {
      // ignore
    } finally {
      window.close();
    }
  });

  skipBtn.addEventListener('click', () => {
    // Refocus original window even on skip
    chrome.runtime.sendMessage({ type: 'focusWindow', windowId: String(windowId) }, () => {});
    window.close();
  });

  labelInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const label = labelInput.value.trim();
      try {
        await saveLabel(windowId, label);
        chrome.runtime.sendMessage({ type: 'focusWindow', windowId: String(windowId) }, () => {});
      } catch (e) {}
      window.close();
    }
  });

  // Open the extension popup for advanced settings
  if (openPopupLink) {
    openPopupLink.addEventListener('click', async (e) => {
      e.preventDefault();
      // Try opening the default popup UI in a new tab
      const popupUrl = chrome.runtime.getURL('popup.html');
      try {
        await chrome.tabs.create({ url: popupUrl });
      } catch (err) {
        // If tabs.create fails, ignore
      }
    });
  }
});
