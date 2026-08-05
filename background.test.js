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

test('isAllowedDuplicate', () => {
    assert.strictEqual(context.isAllowedDuplicate('https://docs.google.com/document/d/123', ['*docs.google.com*']), true);
    assert.strictEqual(context.isAllowedDuplicate('https://github.com', ['*docs.google.com*']), false);
});
