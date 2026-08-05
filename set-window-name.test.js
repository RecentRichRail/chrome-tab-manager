const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// Mock browser globals before requiring
global.document = {
  addEventListener: () => {},
  getElementById: () => ({
    focus: () => {},
    addEventListener: () => {}
  })
};
global.location = { search: '' };
global.chrome = {
  runtime: {
    sendMessage: () => {},
    getURL: () => ''
  }
};
global.window = {
  close: () => {}
};

// Use eval instead of require since set-window-name.js is a vanilla browser script
const code = fs.readFileSync('./set-window-name.js', 'utf8');
eval(code);

test('getQueryParam', async (t) => {
  await t.test('should extract existing query parameter', () => {
    global.location.search = '?windowId=123&test=val';
    assert.strictEqual(getQueryParam('windowId'), '123');
    assert.strictEqual(getQueryParam('test'), 'val');
  });

  await t.test('should return null for missing parameter', () => {
    global.location.search = '?windowId=123';
    assert.strictEqual(getQueryParam('missing'), null);
  });

  await t.test('should handle empty search string', () => {
    global.location.search = '';
    assert.strictEqual(getQueryParam('windowId'), null);
  });

  await t.test('should handle parameters with empty values', () => {
    global.location.search = '?empty=&next=val';
    assert.strictEqual(getQueryParam('empty'), '');
    assert.strictEqual(getQueryParam('next'), 'val');
  });

  await t.test('should handle URL encoding', () => {
    global.location.search = '?name=Hello%20World&symbol=%26';
    assert.strictEqual(getQueryParam('name'), 'Hello World');
    assert.strictEqual(getQueryParam('symbol'), '&');
  });
});
