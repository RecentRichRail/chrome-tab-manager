const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('./background.js', 'utf8');
const context = {
  chrome: {
    storage: {
      onChanged: { addListener: () => {} },
      sync: { get: () => Promise.resolve({}), set: () => Promise.resolve({}) },
      local: { get: () => Promise.resolve({}), set: () => Promise.resolve({}) }
    },
    tabs: {
      onCreated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onActivated: { addListener: () => {} },
      onAttached: { addListener: () => {} },
      onDetached: { addListener: () => {} },
      query: () => Promise.resolve([])
    },
    tabGroups: {
      onCreated: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onRemoved: { addListener: () => {} }
    },
    runtime: {
      onMessage: { addListener: () => {} },
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} }
    },
    windows: {
      onCreated: { addListener: () => {} },
      onFocusChanged: { addListener: () => {} },
      onBoundsChanged: { addListener: () => {} },
      onRemoved: { addListener: () => {} }
    },
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {}
    }
  },
  console: { log: () => {}, error: () => {} },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Set: Set,
  Map: Map,
  URL: URL,
  String: String,
  Number: Number,
  Math: Math,
  Promise: Promise,
  Date: Date,
  setInterval: setInterval,
  clearInterval: clearInterval
};

vm.createContext(context);
vm.runInContext(code, context);

test('normalizeUrl', () => {
    assert.strictEqual(context.normalizeUrl('http://example.com/path#hash'), 'http://example.com/path');
    assert.strictEqual(context.normalizeUrl('http://example.com/path'), 'http://example.com/path');
    assert.strictEqual(context.normalizeUrl('invalid-url'), 'invalid-url');
});

test('sanitizeUrlForLog', () => {
    assert.strictEqual(context.sanitizeUrlForLog('http://example.com/path?query=123#hash'), 'http://example.com/path');
    assert.strictEqual(context.sanitizeUrlForLog('invalid-url'), '[invalid/redacted url]');
});

test('matchesPattern', () => {
    assert.strictEqual(context.matchesPattern('https://example.com', '*example.com*'), true);
    assert.strictEqual(context.matchesPattern('https://example.com', '*test.com*'), false);
    assert.strictEqual(context.matchesPattern('https://github.com/user/repo', '*github.com*'), true);
    assert.strictEqual(context.matchesPattern('https://github.com/user/repo', 'https://github.com/*'), true);
    assert.strictEqual(context.matchesPattern('https://github.com/user/repo', 'github.com/*'), false);
    assert.strictEqual(context.matchesPattern('https://github.com/user/repo', '*github.com/*'), true);
});

test('isAllowedDuplicate', async (t) => {
    await t.test('exact match', () => {
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page1', ['https://example.com/page1']), true);
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page2', ['https://example.com/page1']), false);
    });

    await t.test('wildcard match', () => {
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page1', ['*example.com*']), true);
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page1', ['https://example.com/*']), true);
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page1', ['*page2*']), false);
    });

    await t.test('normalized url (without hash)', () => {
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page#section1', ['https://example.com/page']), true);
        // Wildcard ignoring hash
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page#section2', ['*example.com/page']), true);
        // Match including hash
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page#section1', ['https://example.com/page#section1']), true);
    });

    await t.test('case insensitivity', () => {
        assert.strictEqual(context.isAllowedDuplicate('HTTPS://EXAMPLE.COM/page', ['https://example.com/page']), true);
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/PAGE', ['https://example.com/page']), true);
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page', ['HTTPS://EXAMPLE.COM/PAGE']), true);
    });

    await t.test('empty patterns', () => {
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page', []), false);
    });

    await t.test('multiple patterns', () => {
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page', ['*test.com*', 'https://example.com/page']), true);
        assert.strictEqual(context.isAllowedDuplicate('https://example.com/page', ['*test.com*', '*other.com*']), false);
    });
});
