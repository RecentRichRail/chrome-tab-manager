const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Load the background script
const code = fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8');

// Create a mock sandbox for the background script
const sandbox = {
  console: { ...console, error: () => {} }, // suppress expected errors
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Map,
  Set,
  URL,
  String,
  chrome: {
    storage: {
      sync: { get: () => {}, set: () => {} },
      local: { get: () => {}, set: () => {} },
      onChanged: { addListener: () => {} }
    },
    tabs: {
      onCreated: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onAttached: { addListener: () => {} },
      onActivated: { addListener: () => {} },
      onDetached: { addListener: () => {} },
      onReplaced: { addListener: () => {} },
      onMoved: { addListener: () => {} },
      query: () => {}
    },
    tabGroups: {
      onCreated: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onMoved: { addListener: () => {} }
    },
    windows: {
      onCreated: { addListener: () => {} },
      onFocusChanged: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onBoundsChanged: { addListener: () => {} },
      WINDOW_ID_NONE: -1
    },
    runtime: {
      onInstalled: { addListener: () => {} },
      onMessage: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      getURL: () => 'chrome-extension://mock/'
    },
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {},
      setTitle: () => {},
      onClicked: { addListener: () => {} }
    },
    contextMenus: {
      onClicked: { addListener: () => {} }
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const matchesPattern = sandbox.matchesPattern;

test('matchesPattern', async (t) => {
  await t.test('exact match without wildcards', () => {
    assert.strictEqual(matchesPattern('https://example.com', 'https://example.com'), true);
    assert.strictEqual(matchesPattern('https://example.com', 'https://example.org'), false);
  });

  await t.test('prefix match with wildcard at the end', () => {
    assert.strictEqual(matchesPattern('https://example.com/test', 'https://example.com*'), true);
    assert.strictEqual(matchesPattern('https://example.org/test', 'https://example.com*'), false);
  });

  await t.test('suffix match with wildcard at the beginning', () => {
    assert.strictEqual(matchesPattern('https://example.com/test', '*example.com/test'), true);
    assert.strictEqual(matchesPattern('https://example.com/test', '*example.org/test'), false);
  });

  await t.test('wildcard in the middle', () => {
    assert.strictEqual(matchesPattern('https://example.com/test/page', 'https://*.com/*/page'), true);
    assert.strictEqual(matchesPattern('https://example.com/test/page', 'https://*.org/*/page'), false);
  });

  await t.test('consecutive wildcards', () => {
    assert.strictEqual(matchesPattern('https://example.com/test', 'https://**'), true);
    assert.strictEqual(matchesPattern('https://example.com/test', '**example.com**'), true);
  });

  await t.test('case insensitivity', () => {
    assert.strictEqual(matchesPattern('HTTPS://EXAMPLE.COM', 'https://example.com'), true);
    assert.strictEqual(matchesPattern('https://example.com', 'HTTPS://EXAMPLE.COM'), true);
  });

  await t.test('empty patterns or URLs', () => {
    assert.strictEqual(matchesPattern('', 'https://example.com'), false);
    assert.strictEqual(matchesPattern('https://example.com', ''), false);
    assert.strictEqual(matchesPattern('', ''), false);
    assert.strictEqual(matchesPattern(null, 'test'), false);
    assert.strictEqual(matchesPattern('test', null), false);
  });

  await t.test('excessively long inputs (DoS mitigation)', () => {
    const longUrl = 'https://' + 'a'.repeat(2000) + '.com';
    assert.strictEqual(matchesPattern(longUrl, '*a*'), false);

    const longPattern = '*'.repeat(201);
    assert.strictEqual(matchesPattern('https://example.com', longPattern), false);
  });

  await t.test('pattern cache eviction (MAX_PATTERN_CACHE_SIZE = 500)', () => {
    // Fill the cache
    for (let i = 0; i < 505; i++) {
      matchesPattern('https://example.com', `*test${i}*`);
    }
    assert.strictEqual(matchesPattern('https://example.com', '*example.com*'), true);
  });

  await t.test('overlapping parts', () => {
    assert.strictEqual(matchesPattern('https://abcbc.com', '*bc*bc*'), true);
  });

  await t.test('edge case: ending wildcard vs no ending wildcard', () => {
    assert.strictEqual(matchesPattern('https://example.com/abc', '*example.com'), false);
    assert.strictEqual(matchesPattern('https://example.com', '*example.com'), true);
  });

  await t.test('with cachedLowerUrl', () => {
    assert.strictEqual(matchesPattern('HTTPS://EXAMPLE.COM', '*example.com*', 'https://example.com'), true);
  });

  await t.test('invalid types gracefully handled', () => {
    // Should catch the error and return false due to the try-catch block
    assert.strictEqual(matchesPattern({}, '*test*'), false);
  });
});
