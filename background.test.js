const fs = require('fs');
const test = require('node:test');
const assert = require('node:assert');
const vm = require('vm');

const code = fs.readFileSync('./background.js', 'utf8');

const mockChrome = {
  storage: {
    sync: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
    local: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
    onChanged: { addListener: () => {} }
  },
  tabs: {
    query: () => Promise.resolve([]),
    get: () => Promise.resolve({}),
    group: () => Promise.resolve(),
    move: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    update: () => Promise.resolve(),
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onUpdated: { addListener: () => {} },
    onActivated: { addListener: () => {} }
  },
  runtime: {
    onStartup: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
    onMessage: { addListener: () => {} },
    sendMessage: () => Promise.resolve(),
    getURL: () => 'chrome-extension://test'
  },
  windows: {
    query: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve(),
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onBoundsChanged: { addListener: () => {} }
  },
  tabGroups: {
    query: () => Promise.resolve([]),
    update: () => Promise.resolve(),
    TAB_GROUP_ID_NONE: -1,
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onUpdated: { addListener: () => {} }
  },
  action: {
    setBadgeText: () => Promise.resolve(),
    setBadgeBackgroundColor: () => Promise.resolve()
  },
  scripting: {
    executeScript: () => Promise.resolve()
  }
};

const context = vm.createContext({
  chrome: mockChrome,
  console: {
    log: () => {},
    error: () => {},
    warn: () => {}
  },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math,
  Map: Map,
  Set: Set,
  Promise: Promise,
  crypto: {
    randomUUID: () => 'test-uuid'
  },
  URL: URL,
  Date: Date,
  String: String,
  Number: Number,
  Object: Object,
  Array: Array,
});

vm.runInContext(code, context);

test('normalizeUrl', () => {
  assert.strictEqual(context.normalizeUrl('https://example.com/page#section'), 'https://example.com/page');
  assert.strictEqual(context.normalizeUrl('https://example.com/page'), 'https://example.com/page');
  assert.strictEqual(context.normalizeUrl('not a url'), 'not a url');
});

test('sanitizeUrlForLog', () => {
  assert.strictEqual(context.sanitizeUrlForLog('https://example.com/page?secret=123'), 'https://example.com/page');
  assert.strictEqual(context.sanitizeUrlForLog(null), 'null');
  assert.strictEqual(context.sanitizeUrlForLog('invalid'), '[invalid/redacted url]');
});

test('matchesPattern', () => {
  assert.strictEqual(context.matchesPattern('https://example.com/test', '*example.com*'), true);
  assert.strictEqual(context.matchesPattern('https://example.com/test', 'https://example.com/test'), true);
  assert.strictEqual(context.matchesPattern('https://example.com/test', '*google.com*'), false);
  assert.strictEqual(context.matchesPattern('https://example.com/test/page', '*example.com/test*'), true);

  // Case sensitivity
  assert.strictEqual(context.matchesPattern('https://EXAMPLE.com/test', '*example.com*'), true);
});

test('isAllowedDuplicate', () => {
  const patterns = ['*github.com*', '*google.com*'];
  assert.strictEqual(context.isAllowedDuplicate('https://github.com/repo', patterns), true);
  assert.strictEqual(context.isAllowedDuplicate('https://example.com', patterns), false);

  // Test with hash
  assert.strictEqual(context.isAllowedDuplicate('https://google.com/search#q=test', patterns), true);
});
