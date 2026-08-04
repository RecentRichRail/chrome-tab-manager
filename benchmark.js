const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
global.document = dom.window.document;

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}
function stripWindowLabel(title, windowId) {
    return title;
}

const tabs = [];
for (let i = 0; i < 10000; i++) {
    tabs.push({
        title: "Test Tab with a long title to make escaping more complex < > & ' \" " + i,
        url: "https://example.com/test-url-with-some-params?a=1&b=2&c=3&d=4" + i,
        lowerTitle: "test tab",
        lowerUrl: "test url",
        tabId: i,
        windowId: 1
    });
}
const gid = 'ungrouped';

function runTest(optimize) {
    const start = process.hrtime.bigint();
    const gContent = document.createElement('div');
    for (const tab of tabs) {
        const baseTitle = stripWindowLabel(tab.title, tab.windowId);
        const tEl = document.createElement('div');
        tEl.className = 'url-item explorer-tab-item';
        tEl.style.margin = '6px 0';
        tEl.setAttribute('role', 'button');
        tEl.setAttribute('tabindex', '0');
        tEl.dataset.title = String(tab.title || '(no title)');
        tEl.dataset.url = String(tab.url || '');
        tEl.dataset.lowertitle = tab.lowerTitle;
        tEl.dataset.lowerurl = tab.lowerUrl;
        tEl.dataset.tabid = String(tab.tabId);
        tEl.dataset.windowid = String(tab.windowId);
        tEl.dataset.groupid = String(gid === 'ungrouped' ? '-1' : gid);

        if (optimize) {
            const escapedTitle = escapeHtml(baseTitle);
            const escapedUrl = escapeHtml(tab.url || '');
            tEl.innerHTML = `
              <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapedTitle}">${escapedTitle}</div>
                <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;" title="${escapedUrl}">${escapedUrl}</div>
              </div>
              <div style="margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;">
                <button class="close-tab-btn" title="Close tab" aria-label="Close tab: ${escapedTitle}" data-tabid="${tab.tabId}">✕</button>
              </div>
            `;
        } else {
            tEl.innerHTML = `
              <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(baseTitle)}">${escapeHtml(baseTitle)}</div>
                <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;" title="${escapeHtml(tab.url || '')}">${escapeHtml(tab.url || '')}</div>
              </div>
              <div style="margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;">
                <button class="close-tab-btn" title="Close tab" aria-label="Close tab: ${escapeHtml(baseTitle)}" data-tabid="${tab.tabId}">✕</button>
              </div>
            `;
        }
        gContent.appendChild(tEl);
    }
    const end = process.hrtime.bigint();
    return Number(end - start) / 1000000;
}

// warmup
for(let i=0; i<10; i++) {
    runTest(false);
    runTest(true);
}
let totalUnopt = 0;
let totalOpt = 0;
for(let i=0; i<50; i++) {
    totalUnopt += runTest(false);
    totalOpt += runTest(true);
}
console.log("Unoptimized: " + (totalUnopt/50) + "ms");
console.log("Optimized: " + (totalOpt/50) + "ms");
