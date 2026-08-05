const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  chrome: {
    storage: { onChanged: { addListener: () => {} }, sync: { get: () => {} }, local: { get: () => {} } },
    tabs: { query: () => Promise.resolve([]), get: () => {}, onUpdated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onCreated: { addListener: () => {} }, onActivated: { addListener: () => {} } },
    tabGroups: { query: () => {}, TAB_GROUP_ID_NONE: -1, onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onUpdated: { addListener: () => {} } },
    windows: { onRemoved: { addListener: () => {} }, onCreated: { addListener: () => {} }, onBoundsChanged: { addListener: () => {} } },
    runtime: { onMessage: { addListener: () => {} }, onStartup: { addListener: () => {} }, onInstalled: { addListener: () => {} } },
    action: { setBadgeText: () => {}, setBadgeBackgroundColor: () => {} },
    scripting: { executeScript: () => {} }
  },
  console: { ...console, error: () => {}, log: () => {} },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math,
  crypto: { randomUUID: () => 'uuid' },
  Promise: Promise,
  URL: URL,
  String: String,
  Number: Number,
  Date: Date,
  Map: Map,
  Set: Set,
  Object: Object,
  Array: Array,
  Error: Error
};

vm.createContext(context);
const code = fs.readFileSync('./background.js', 'utf8');
vm.runInContext(code, context);

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      passed++;
      console.log(`✅ ${name}`);
    } catch (e) {
      console.error(`❌ ${name}`);
      console.error(e);
      failed++;
    }
  }

  // Basic matching tests
  test('matchesPattern - exact match', () => {
    assert.strictEqual(context.matchesPattern('https://example.com', 'https://example.com'), true);
    assert.strictEqual(context.matchesPattern('https://example.com/path', 'https://example.com'), false);
    assert.strictEqual(context.matchesPattern('https://example.com', 'https://example.com/path'), false);
  });

  test('matchesPattern - prefix wildcard', () => {
    assert.strictEqual(context.matchesPattern('https://example.com', '*example.com'), true);
    assert.strictEqual(context.matchesPattern('https://sub.example.com', '*example.com'), true);
    assert.strictEqual(context.matchesPattern('https://example.com/path', '*example.com'), false);
  });

  test('matchesPattern - suffix wildcard', () => {
    assert.strictEqual(context.matchesPattern('https://example.com', 'https://example*'), true);
    assert.strictEqual(context.matchesPattern('https://example.com/path', 'https://example*'), true);
    assert.strictEqual(context.matchesPattern('http://example.com', 'https://example*'), false);
  });

  test('matchesPattern - both wildcards', () => {
    assert.strictEqual(context.matchesPattern('https://sub.example.com/path', '*example.com*'), true);
    assert.strictEqual(context.matchesPattern('https://example.com', '*example.com*'), true);
    assert.strictEqual(context.matchesPattern('https://other.com', '*example.com*'), false);
  });

  test('matchesPattern - multiple wildcards', () => {
    assert.strictEqual(context.matchesPattern('https://foo.example.com/bar', '*foo*bar*'), true);
    assert.strictEqual(context.matchesPattern('https://foo.example.com/baz', '*foo*bar*'), false);
    assert.strictEqual(context.matchesPattern('https://a.b.c.d.e', '*a*c*e*'), true);
    assert.strictEqual(context.matchesPattern('https://a.b.d.e', '*a*c*e*'), false);
  });

  // Edge cases and DoS mitigation (testing background.js:667)
  test('matchesPattern - empty and null inputs', () => {
    assert.strictEqual(context.matchesPattern('', '*'), false);
    assert.strictEqual(context.matchesPattern('https://example.com', ''), false);
    assert.strictEqual(context.matchesPattern(null, '*'), false);
    assert.strictEqual(context.matchesPattern('https://example.com', null), false);
    assert.strictEqual(context.matchesPattern(undefined, '*'), false);
    assert.strictEqual(context.matchesPattern('https://example.com', undefined), false);
  });

  test('matchesPattern - length limits (DoS mitigation)', () => {
    const maxUrl = 'https://example.com/' + 'a'.repeat(2000 - 20); // exactly 2000 chars
    const tooLongUrl = maxUrl + 'a'; // 2001 chars
    assert.strictEqual(context.matchesPattern(maxUrl, '*example*'), true);
    assert.strictEqual(context.matchesPattern(tooLongUrl, '*example*'), false);

    const maxPattern = '*a'.repeat(100); // 200 chars
    const tooLongPattern = maxPattern + '*'; // 201 chars
    assert.strictEqual(context.matchesPattern('https://example.com/a', maxPattern), false); // will evaluate but not match
    assert.strictEqual(context.matchesPattern('https://example.com', tooLongPattern), false); // fails length check immediately
  });

  test('matchesPattern - consecutive wildcards', () => {
    assert.strictEqual(context.matchesPattern('abc', '*a**b*c*'), true);
    assert.strictEqual(context.matchesPattern('abc', '***a***b***c***'), true);
  });

  test('matchesPattern - cache eviction (MAX_PATTERN_CACHE_SIZE)', () => {
    // Insert more than 500 items to trigger eviction
    for (let i = 0; i < 505; i++) {
      context.matchesPattern('https://example.com', `*test${i}*`);
    }

    // We can't access patternParseCache directly since it's a const inside the vm context script
    // unless we expose it. But we can verify it doesn't crash on eviction.
    assert.strictEqual(context.matchesPattern('https://example.com', '*test504*'), false);
  });

  test('matchesPattern - malformed inputs (type safety)', () => {
    assert.strictEqual(context.matchesPattern({}, '*'), false);
    assert.strictEqual(context.matchesPattern('https://example.com', {}), false);
    assert.strictEqual(context.matchesPattern(123, '*2*'), false);
    assert.strictEqual(context.matchesPattern('123', 2), false);
  });

  test('matchesPattern - case insensitivity', () => {
    assert.strictEqual(context.matchesPattern('https://EXAMPLE.com', '*example*'), true);
    assert.strictEqual(context.matchesPattern('https://example.com', '*EXAMPLE*'), true);
    assert.strictEqual(context.matchesPattern('https://EXAMPLE.com', 'https://example.com'), true);
  });

  console.log(`\nTests complete: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
