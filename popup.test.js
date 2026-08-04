const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Read popup.js file
const popupJsPath = path.join(__dirname, 'popup.js');
const code = fs.readFileSync(popupJsPath, 'utf8');

// Extract the escapeHtml function dynamically to test it independently of browser APIs
const escapeHtmlMatch = code.match(/function escapeHtml\(s\) \{[\s\S]*?\n\}/);
if (!escapeHtmlMatch) throw new Error("Could not find escapeHtml in popup.js");
const escapeHtml = new Function('s', `
  ${escapeHtmlMatch[0]}
  return escapeHtml(s);
`);

test('escapeHtml: should handle undefined and null', () => {
  assert.strictEqual(escapeHtml(undefined), 'undefined');
  assert.strictEqual(escapeHtml(null), 'null');
});

test('escapeHtml: should escape HTML characters correctly', () => {
  assert.strictEqual(escapeHtml('&'), '&amp;');
  assert.strictEqual(escapeHtml('<'), '&lt;');
  assert.strictEqual(escapeHtml('>'), '&gt;');
  assert.strictEqual(escapeHtml('"'), '&quot;');
  assert.strictEqual(escapeHtml("'"), '&#39;');
});

test('escapeHtml: should handle combinations of HTML characters', () => {
  assert.strictEqual(
    escapeHtml('<script>alert("XSS & \'test\'")</script>'),
    '&lt;script&gt;alert(&quot;XSS &amp; &#39;test&#39;&quot;)&lt;/script&gt;'
  );
});

test('escapeHtml: should not change string without HTML characters', () => {
  assert.strictEqual(escapeHtml('Hello World! 123'), 'Hello World! 123');
});

test('escapeHtml: should handle non-string inputs', () => {
  assert.strictEqual(escapeHtml(123), '123');
  assert.strictEqual(escapeHtml({}), '[object Object]');
  assert.strictEqual(escapeHtml(true), 'true');
});
