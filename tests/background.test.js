const fs = require('fs');
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Extract the function from background.js
const code = fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8');
const functionMatch = code.match(/function sanitizeUrlForLog\([^)]*\)\s*{[\s\S]*?\n}/m);

if (!functionMatch) {
  throw new Error("Function sanitizeUrlForLog not found");
}

// Evaluate the function into the current scope
let sanitizeUrlForLogFn;
eval(functionMatch[0].replace('function sanitizeUrlForLog', 'sanitizeUrlForLogFn = function'));

test('sanitizeUrlForLog', async (t) => {
  await t.test('keeps standard HTTP URLs origin and pathname', () => {
    assert.strictEqual(sanitizeUrlForLogFn('http://example.com/path'), 'http://example.com/path');
  });

  await t.test('keeps standard HTTPS URLs origin and pathname', () => {
    assert.strictEqual(sanitizeUrlForLogFn('https://example.com/path/to/resource'), 'https://example.com/path/to/resource');
  });

  await t.test('removes query parameters', () => {
    assert.strictEqual(sanitizeUrlForLogFn('https://example.com/search?q=secret'), 'https://example.com/search');
  });

  await t.test('removes hash fragments', () => {
    assert.strictEqual(sanitizeUrlForLogFn('https://example.com/page#section'), 'https://example.com/page');
  });

  await t.test('keeps port numbers', () => {
    assert.strictEqual(sanitizeUrlForLogFn('http://localhost:8080/dev'), 'http://localhost:8080/dev');
  });

  await t.test('removes authentication credentials', () => {
    assert.strictEqual(sanitizeUrlForLogFn('https://user:pass@example.com/admin'), 'https://example.com/admin');
  });

  await t.test('handles empty string', () => {
    assert.strictEqual(sanitizeUrlForLogFn(''), '');
  });

  await t.test('handles null input', () => {
    assert.strictEqual(sanitizeUrlForLogFn(null), 'null');
  });

  await t.test('handles undefined input', () => {
    assert.strictEqual(sanitizeUrlForLogFn(undefined), 'undefined');
  });

  await t.test('handles invalid URL string gracefully', () => {
    assert.strictEqual(sanitizeUrlForLogFn('not-a-valid-url'), '[invalid/redacted url]');
  });

  await t.test('handles random word gracefully', () => {
    assert.strictEqual(sanitizeUrlForLogFn('hello'), '[invalid/redacted url]');
  });

  await t.test('handles chrome-extension protocols in Node context', () => {
    assert.strictEqual(sanitizeUrlForLogFn('chrome-extension://abcdefghijklmnop/page.html'), 'null/page.html');
  });

  await t.test('handles chrome protocols in Node context', () => {
    assert.strictEqual(sanitizeUrlForLogFn('chrome://settings/'), 'null/');
  });
});
