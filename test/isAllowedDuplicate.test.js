const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert');

const code = fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8');

const context = {
  console: { log: () => {}, error: () => {}, warn: () => {} },
  chrome: {
    storage: { sync: { get: () => Promise.resolve({}) }, local: { get: () => Promise.resolve({}) }, onChanged: { addListener: () => {} } },
    windows: { onBoundsChanged: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onCreated: { addListener: () => {} } },
    runtime: { onMessage: { addListener: () => {} }, onStartup: { addListener: () => {} }, onInstalled: { addListener: () => {} } },
    tabs: { query: () => Promise.resolve([]), onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onUpdated: { addListener: () => {} }, onAttached: { addListener: () => {} }, onActivated: { addListener: () => {} }, onReplaced: { addListener: () => {} } },
    tabGroups: { onUpdated: { addListener: () => {} }, onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} } },
    action: { setBadgeText: () => {}, setBadgeBackgroundColor: () => {} }
  },
  URL: URL,
  String: String,
  Map: Map,
  Set: Set,
  setTimeout: () => {},
  setInterval: () => {},
  clearTimeout: () => {},
  clearInterval: () => {}
};

vm.createContext(context);
vm.runInContext(code, context);

const isAllowedDuplicate = context.isAllowedDuplicate;

test('isAllowedDuplicate', async (t) => {
  await t.test('exact match with single pattern', () => {
    assert.strictEqual(isAllowedDuplicate('https://example.com/test', ['https://example.com/test']), true);
  });

  await t.test('no match with single pattern', () => {
    assert.strictEqual(isAllowedDuplicate('https://example.com/test', ['https://github.com']), false);
  });

  await t.test('empty patterns array returns false', () => {
    assert.strictEqual(isAllowedDuplicate('https://example.com', []), false);
  });

  await t.test('wildcard match', () => {
    assert.strictEqual(isAllowedDuplicate('https://github.com/project', ['*github.com*']), true);
    assert.strictEqual(isAllowedDuplicate('https://localhost:8080', ['*localhost*']), true);
  });

  await t.test('match against second pattern in array', () => {
    assert.strictEqual(isAllowedDuplicate('https://example.com', ['*github.com*', 'https://example.com']), true);
  });

  await t.test('normalization: matches pattern ignoring hash', () => {
    // Original URL has hash, pattern doesn't.
    // normalizedUrl (without hash) will match the pattern.
    assert.strictEqual(isAllowedDuplicate('https://example.com/#section', ['https://example.com/']), true);
  });

  await t.test('normalization: matches pattern including hash', () => {
    // Original URL has hash, pattern has hash.
    // original URL will match the pattern, normalizedUrl won't.
    assert.strictEqual(isAllowedDuplicate('https://example.com/#section', ['https://example.com/#section']), true);
  });

  await t.test('case insensitivity in URL', () => {
    assert.strictEqual(isAllowedDuplicate('https://Example.com/Path', ['*example.com/path*']), true);
  });

  await t.test('case insensitivity in pattern', () => {
    assert.strictEqual(isAllowedDuplicate('https://example.com/path', ['*Example.COM/Path*']), true);
  });

  await t.test('empty URL handles gracefully', () => {
    assert.strictEqual(isAllowedDuplicate('', ['*example*']), false);
  });

  await t.test('invalid URL string (fails URL parsing in normalizeUrl)', () => {
    // normalizeUrl uses new URL() which will throw, returning the original string.
    assert.strictEqual(isAllowedDuplicate('not-a-real-url', ['not-a-real-url']), true);
  });
});
