const test = require('node:test');
const assert = require('node:assert');

// Mock globals before requiring
global.chrome = {
  runtime: {
    sendMessage: () => {},
    getURL: () => {}
  }
};
global.document = {
  addEventListener: () => {},
  getElementById: () => ({
    focus: () => {},
    addEventListener: () => {},
  })
};
global.window = {
  close: () => {}
};

const fs = require('fs');
const code = fs.readFileSync('./set-window-name.js', 'utf8');
eval(code);

test('getQueryParam', async (t) => {
  await t.test('returns value for existing parameter', () => {
    global.location = { search: '?windowId=123&test=abc' };
    assert.strictEqual(getQueryParam('windowId'), '123');
    assert.strictEqual(getQueryParam('test'), 'abc');
  });

  await t.test('returns null for missing parameter', () => {
    global.location = { search: '?windowId=123' };
    assert.strictEqual(getQueryParam('missing'), null);
  });

  await t.test('handles empty search string', () => {
    global.location = { search: '' };
    assert.strictEqual(getQueryParam('windowId'), null);
  });
});
