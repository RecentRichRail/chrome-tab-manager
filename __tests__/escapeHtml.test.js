const test = require('node:test');
const assert = require('node:assert');
const { escapeHtml } = require('../popup.js');

test('escapeHtml', async (t) => {
  await t.test('escapes all target HTML characters', () => {
    assert.strictEqual(escapeHtml('&'), '&amp;');
    assert.strictEqual(escapeHtml('<'), '&lt;');
    assert.strictEqual(escapeHtml('>'), '&gt;');
    assert.strictEqual(escapeHtml('"'), '&quot;');
    assert.strictEqual(escapeHtml("'"), '&#39;');
  });

  await t.test('leaves safe strings unchanged', () => {
    assert.strictEqual(escapeHtml('Hello World! 123'), 'Hello World! 123');
    assert.strictEqual(escapeHtml('abcxyz'), 'abcxyz');
  });

  await t.test('escapes combinations of characters', () => {
    assert.strictEqual(escapeHtml('<div>"Hello" & \'World\'</div>'), '&lt;div&gt;&quot;Hello&quot; &amp; &#39;World&#39;&lt;/div&gt;');
  });

  await t.test('handles multiple occurrences of the same character', () => {
    assert.strictEqual(escapeHtml('<<<<<>>>>>'), '&lt;&lt;&lt;&lt;&lt;&gt;&gt;&gt;&gt;&gt;');
    assert.strictEqual(escapeHtml('&&&'), '&amp;&amp;&amp;');
  });

  await t.test('coerces non-string inputs to strings', () => {
    assert.strictEqual(escapeHtml(123), '123');
    assert.strictEqual(escapeHtml(null), 'null');
    assert.strictEqual(escapeHtml(undefined), 'undefined');
    assert.strictEqual(escapeHtml(true), 'true');
    assert.strictEqual(escapeHtml({}), '[object Object]');
  });
});
