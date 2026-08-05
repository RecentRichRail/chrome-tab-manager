const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Load the background script
const code = fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8');

// Create a mock sandbox for the background script
const sandbox = {
  console: { ...console, error: () => {}, log: () => {} }, // suppress expected errors and logs
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Map,
  Set,
  URL,
  String,
  Math,
  crypto: { randomUUID: () => 'uuid' },
  Promise: Promise,
  Number: Number,
  Date: Date,
  Object: Object,
  Array: Array,
  Error: Error,
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
      query: () => Promise.resolve([]),
      get: () => {}
    },
    tabGroups: {
      onCreated: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onMoved: { addListener: () => {} },
      query: () => {},
      TAB_GROUP_ID_NONE: -1
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
    },
    scripting: {
      executeScript: () => {}
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
    assert.strictEqual(matchesPattern('https://example.com/path', 'https://example.com'), false);
    assert.strictEqual(matchesPattern('https://example.com', 'https://example.com/path'), false);
  });

  await t.test('prefix match with wildcard at the end (suffix wildcard)', () => {
    assert.strictEqual(matchesPattern('https://example.com/test', 'https://example.com*'), true);
    assert.strictEqual(matchesPattern('https://example.org/test', 'https://example.com*'), false);
    assert.strictEqual(matchesPattern('https://example.com', 'https://example*'), true);
    assert.strictEqual(matchesPattern('https://example.com/path', 'https://example*'), true);
    assert.strictEqual(matchesPattern('http://example.com', 'https://example*'), false);
  });

  await t.test('suffix match with wildcard at the beginning (prefix wildcard)', () => {
    assert.strictEqual(matchesPattern('https://example.com/test', '*example.com/test'), true);
    assert.strictEqual(matchesPattern('https://example.com/test', '*example.org/test'), false);
    assert.strictEqual(matchesPattern('https://example.com', '*example.com'), true);
    assert.strictEqual(matchesPattern('https://sub.example.com', '*example.com'), true);
    assert.strictEqual(matchesPattern('https://example.com/path', '*example.com'), false);
  });

  await t.test('both wildcards / wildcard in the middle', () => {
    assert.strictEqual(matchesPattern('https://example.com/test/page', 'https://*.com/*/page'), true);
    assert.strictEqual(matchesPattern('https://example.com/test/page', 'https://*.org/*/page'), false);
    assert.strictEqual(matchesPattern('https://sub.example.com/path', '*example.com*'), true);
    assert.strictEqual(matchesPattern('https://example.com', '*example.com*'), true);
    assert.strictEqual(matchesPattern('https://other.com', '*example.com*'), false);
  });

  await t.test('multiple wildcards', () => {
    assert.strictEqual(matchesPattern('https://foo.example.com/bar', '*foo*bar*'), true);
    assert.strictEqual(matchesPattern('https://foo.example.com/baz', '*foo*bar*'), false);
    assert.strictEqual(matchesPattern('https://a.b.c.d.e', '*a*c*e*'), true);
    assert.strictEqual(matchesPattern('https://a.b.d.e', '*a*c*e*'), false);
  });

  await t.test('consecutive wildcards', () => {
    assert.strictEqual(matchesPattern('https://example.com/test', 'https://**'), true);
    assert.strictEqual(matchesPattern('https://example.com/test', '**example.com**'), true);
    assert.strictEqual(matchesPattern('abc', '*a**b*c*'), true);
    assert.strictEqual(matchesPattern('abc', '***a***b***c***'), true);
  });

  await t.test('case insensitivity', () => {
    assert.strictEqual(matchesPattern('HTTPS://EXAMPLE.COM', 'https://example.com'), true);
    assert.strictEqual(matchesPattern('https://example.com', 'HTTPS://EXAMPLE.COM'), true);
    assert.strictEqual(matchesPattern('https://EXAMPLE.com', '*example*'), true);
    assert.strictEqual(matchesPattern('https://example.com', '*EXAMPLE*'), true);
    assert.strictEqual(matchesPattern('https://EXAMPLE.com', 'https://example.com'), true);
  });

  await t.test('empty and null inputs', () => {
    assert.strictEqual(matchesPattern('', 'https://example.com'), false);
    assert.strictEqual(matchesPattern('https://example.com', ''), false);
    assert.strictEqual(matchesPattern('', ''), false);
    assert.strictEqual(matchesPattern(null, 'test'), false);
    assert.strictEqual(matchesPattern('test', null), false);
    assert.strictEqual(matchesPattern('', '*'), false);
    assert.strictEqual(matchesPattern(null, '*'), false);
    assert.strictEqual(matchesPattern(undefined, '*'), false);
    assert.strictEqual(matchesPattern('https://example.com', undefined), false);
  });

  await t.test('length limits (DoS mitigation)', () => {
    const longUrl = 'https://' + 'a'.repeat(2000) + '.com';
    assert.strictEqual(matchesPattern(longUrl, '*a*'), false);

    const longPattern = '*'.repeat(201);
    assert.strictEqual(matchesPattern('https://example.com', longPattern), false);

    const maxUrl = 'https://example.com/' + 'a'.repeat(2000 - 20); // exactly 2000 chars
    const tooLongUrl = maxUrl + 'a'; // 2001 chars
    assert.strictEqual(matchesPattern(maxUrl, '*example*'), true);
    assert.strictEqual(matchesPattern(tooLongUrl, '*example*'), false);

    const maxPattern2 = '*a'.repeat(100); // 200 chars
    const tooLongPattern2 = maxPattern2 + '*'; // 201 chars
    assert.strictEqual(matchesPattern('https://example.com/a', maxPattern2), false); // will evaluate but not match
    assert.strictEqual(matchesPattern('https://example.com', tooLongPattern2), false); // fails length check immediately
  });

  await t.test('pattern cache eviction (MAX_PATTERN_CACHE_SIZE = 500)', () => {
    // Fill the cache
    for (let i = 0; i < 505; i++) {
      matchesPattern('https://example.com', `*test${i}*`);
    }
    assert.strictEqual(matchesPattern('https://example.com', '*example.com*'), true);
    assert.strictEqual(matchesPattern('https://example.com', '*test504*'), false);
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

  await t.test('malformed inputs / invalid types gracefully handled', () => {
    // Should catch the error and return false due to the try-catch block
    assert.strictEqual(matchesPattern({}, '*test*'), false);
    assert.strictEqual(matchesPattern({}, '*'), false);
    assert.strictEqual(matchesPattern('https://example.com', {}), false);
    assert.strictEqual(matchesPattern(123, '*2*'), false);
    assert.strictEqual(matchesPattern('123', 2), false);
  });
});
