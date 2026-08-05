const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const fileContent = fs.readFileSync('background.js', 'utf8');

global.chrome = {
  storage: {
    onChanged: { addListener: () => {} },
    sync: { get: () => Promise.resolve({}) },
    local: { get: () => Promise.resolve({}) }
  },
  tabs: {
    onCreated: { addListener: () => {} },
    onUpdated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onActivated: { addListener: () => {} },
    query: () => Promise.resolve([])
  },
  tabGroups: {
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onUpdated: { addListener: () => {} }
  },
  runtime: {
    onMessage: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} }
  },
  action: {
    onClicked: { addListener: () => {} },
    setBadgeText: () => {},
    setBadgeBackgroundColor: () => {}
  },
  windows: {
    onFocusChanged: { addListener: () => {} },
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onBoundsChanged: { addListener: () => {} }
  }
};

eval(fileContent);

test('normalizeUrl removes fragment from URL', () => {
  assert.strictEqual(normalizeUrl('https://example.com/path#fragment'), 'https://example.com/path');
});

test('normalizeUrl keeps query parameters intact', () => {
  assert.strictEqual(normalizeUrl('https://example.com/path?query=123'), 'https://example.com/path?query=123');
});

test('normalizeUrl does not modify URLs without fragments', () => {
  assert.strictEqual(normalizeUrl('https://example.com/path'), 'https://example.com/path');
});

test('normalizeUrl returns original string if URL is invalid', () => {
  assert.strictEqual(normalizeUrl('invalid-url'), 'invalid-url');
});

test('normalizeUrl returns original string if URL is empty', () => {
  assert.strictEqual(normalizeUrl(''), '');
});
