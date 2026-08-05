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
      query: () => Promise.resolve([]),
      get: () => Promise.resolve({}),
      group: () => Promise.resolve(),
      move: () => Promise.resolve(),
      remove: () => Promise.resolve()
    },
    tabGroups: {
      onCreated: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      query: () => Promise.resolve([]),
      update: () => Promise.resolve()
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
    },
    commands: {
      onCommand: { addListener: () => {} }
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
    assert.strictEqual(context.normalizeUrl('https://example.com/page?query=1#section'), 'https://example.com/page?query=1');
    // Note: the updated implementation uses typeof url === 'string' ? url.split('#')[0] : url
    // which does not append a trailing slash automatically like 'new URL()' did
    assert.strictEqual(context.normalizeUrl('https://example.com'), 'https://example.com');
    assert.strictEqual(context.normalizeUrl('invalid-url'), 'invalid-url');
    assert.strictEqual(context.normalizeUrl(''), '');
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

test('isAllowedDuplicate', () => {
    assert.strictEqual(context.isAllowedDuplicate('https://docs.google.com/document/d/123', ['*docs.google.com*']), true);
    assert.strictEqual(context.isAllowedDuplicate('https://github.com', ['*docs.google.com*']), false);
});
