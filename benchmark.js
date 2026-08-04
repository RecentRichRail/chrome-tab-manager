const escapeHtml = (unsafe) => {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 };

const tabs = Array.from({ length: 10000 }, (_, i) => ({
    title: `Tab Title ${i} <script>alert("test")</script>`,
    url: `https://example.com/page${i}?a=1&b=2`
}));

function before() {
    let html = '';
    for (const tab of tabs) {
        html += `
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
                  <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(tab.title || '(no title)')}">${escapeHtml(tab.title || '(no title)')}</div>
                  <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;" title="${escapeHtml(tab.url || '')}">${escapeHtml(tab.url || '')}</div>
                </div>
                <div style="margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;">
                  <button class="close-tab-btn" title="Close tab" aria-label="Close tab: ${escapeHtml(tab.title || '(no title)')}" data-tabid="${123}">✕</button>
                </div>
              `;
    }
    return html.length;
}

function after() {
    let html = '';
    for (const tab of tabs) {
        const safeTitle = escapeHtml(tab.title || '(no title)');
        const safeUrl = escapeHtml(tab.url || '');
        html += `
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
                  <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${safeTitle}">${safeTitle}</div>
                  <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;" title="${safeUrl}">${safeUrl}</div>
                </div>
                <div style="margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;">
                  <button class="close-tab-btn" title="Close tab" aria-label="Close tab: ${safeTitle}" data-tabid="${123}">✕</button>
                </div>
              `;
    }
    return html.length;
}

const t0 = performance.now();
before();
const t1 = performance.now();
console.log(`Before: ${t1 - t0} ms`);

const t2 = performance.now();
after();
const t3 = performance.now();
console.log(`After: ${t3 - t2} ms`);
