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

  function showFeedback(message) {
    if (saveBtn.textContent === message) return; // Prevent state corruption if spammed
    const originalText = saveBtn.textContent;
    const originalBg = saveBtn.style.background;
    saveBtn.textContent = message;
    saveBtn.style.background = '#ef4444';

    let srFeedback = document.getElementById('sr-feedback');
    if (!srFeedback) {
      srFeedback = document.createElement('div');
      srFeedback.id = 'sr-feedback';
      srFeedback.setAttribute('role', 'status');
      srFeedback.style.position = 'absolute';
      srFeedback.style.width = '1px';
      srFeedback.style.height = '1px';
      srFeedback.style.overflow = 'hidden';
      srFeedback.style.clip = 'rect(0,0,0,0)';
      document.body.appendChild(srFeedback);
    }
    srFeedback.textContent = message;

    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.style.background = originalBg;
      srFeedback.textContent = '';
    }, 2000);
  }

  saveBtn.addEventListener('click', async () => {
    const label = labelInput.value.trim();
    if (label.length > 50) {
      showFeedback('Max 50 chars');
      return;
    }
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

  labelInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const label = labelInput.value.trim();
      if (label.length > 50) {
        showFeedback('Max 50 chars');
        return;
      }
      try {
        await saveLabel(windowId, label);
        chrome.runtime.sendMessage({ type: 'focusWindow', windowId: String(windowId) }, () => {});
      } catch (e) {}
      window.close();
    } else if (e.key === 'Escape') {
      chrome.runtime.sendMessage({ type: 'focusWindow', windowId: String(windowId) }, () => {});
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

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getQueryParam,
    saveLabel
  };
}
