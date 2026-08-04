function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]; });
}
const title = "Tab Title with <some> & 'quotes'";
const url = "https://example.com/test?a=1&b=2";

console.time('Redundant');
for (let i = 0; i < 100000; i++) {
  const html = `<div>${escapeHtml(title)}</div><div>${escapeHtml(title)}</div><button aria-label="Close ${escapeHtml(title)}"></button>`;
}
console.timeEnd('Redundant');

console.time('Optimized');
for (let i = 0; i < 100000; i++) {
  const escapedTitle = escapeHtml(title);
  const html = `<div>${escapedTitle}</div><div>${escapedTitle}</div><button aria-label="Close ${escapedTitle}"></button>`;
}
console.timeEnd('Optimized');
