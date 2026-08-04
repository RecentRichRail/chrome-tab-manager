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
    let res = 0;
    for (const tab of tabs) {
        const baseTitle = stripWindowLabel(tab.title, tab.windowId);

        if (optimize) {
            const escapedTitle = escapeHtml(baseTitle);
            const escapedUrl = escapeHtml(tab.url || '');
            let s = `
              <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapedTitle}">${escapedTitle}</div>
                <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;" title="${escapedUrl}">${escapedUrl}</div>
              </div>
              <div style="margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;">
                <button class="close-tab-btn" title="Close tab" aria-label="Close tab: ${escapedTitle}" data-tabid="${tab.tabId}">✕</button>
              </div>
            `;
            res += s.length;
        } else {
            let s = `
              <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
                <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(baseTitle)}">${escapeHtml(baseTitle)}</div>
                <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;" title="${escapeHtml(tab.url || '')}">${escapeHtml(tab.url || '')}</div>
              </div>
              <div style="margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;">
                <button class="close-tab-btn" title="Close tab" aria-label="Close tab: ${escapeHtml(baseTitle)}" data-tabid="${tab.tabId}">✕</button>
              </div>
            `;
            res += s.length;
        }
    }
    const end = process.hrtime.bigint();
    return Number(end - start) / 1000000;
}

// warmup
for(let i=0; i<50; i++) {
    runTest(false);
    runTest(true);
}
let totalUnopt = 0;
let totalOpt = 0;
for(let i=0; i<100; i++) {
    totalUnopt += runTest(false);
    totalOpt += runTest(true);
}
console.log("Unoptimized: " + (totalUnopt/100).toFixed(2) + "ms");
console.log("Optimized: " + (totalOpt/100).toFixed(2) + "ms");
