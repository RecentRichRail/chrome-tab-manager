const assert = require('assert');

// We need to mock some browser APIs before requiring background.js
global.chrome = {
  storage: {
    sync: { get: () => Promise.resolve({}), set: () => Promise.resolve({}), onChanged: { addListener: () => {} } },
    local: { get: () => Promise.resolve({}), set: () => Promise.resolve({}) },
    onChanged: { addListener: () => {} }
  },
  tabs: {
    query: () => Promise.resolve([]),
    onCreated: { addListener: () => {} },
    onUpdated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onActivated: { addListener: () => {} },
    onAttached: { addListener: () => {} },
    onDetached: { addListener: () => {} },
    onReplaced: { addListener: () => {} }
  },
  tabGroups: {
    onUpdated: { addListener: () => {} },
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} }
  },
  windows: {
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onBoundsChanged: { addListener: () => {} }
  },
  action: {
    setBadgeText: () => {},
    setBadgeBackgroundColor: () => {}
  },
  runtime: {
    onInstalled: { addListener: () => {} },
    onMessage: { addListener: () => {} },
    onStartup: { addListener: () => {} }
  }
};

const { matchesPattern } = require('../background.js');

console.log("Testing matchesPattern...");
let testsPassed = 0;
let testsFailed = 0;

function runTest(name, url, pattern, expected) {
  try {
    const result = matchesPattern(url, pattern);
    assert.strictEqual(result, expected);
    testsPassed++;
  } catch (error) {
    console.log(`❌ Test failed: ${name}`);
    console.log(`   URL: ${url}`);
    console.log(`   Pattern: ${pattern}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

// 1. Happy path / Basic matches
runTest("Basic wildcard match", "http://example.com/foo", "http://example.com/*", true);
runTest("Basic start/end wildcard", "http://example.com/foo", "*example.com*", true);
runTest("Non-matching URL", "http://example.com", "http://example.org", false);

// 2. Exact match
runTest("Exact match URL", "https://google.com", "https://google.com", true);

// 3. Case insensitivity
runTest("URL upper, pattern lower", "HTTP://EXAMPLE.COM/FOO", "http://example.com/*", true);
runTest("URL lower, pattern upper", "http://example.com/foo", "HTTP://EXAMPLE.COM/*", true);

// 4. Edge cases and DoS mitigation
runTest("Empty URL", "", "pattern", false);
runTest("Empty pattern", "url", "", false);
runTest("Null URL", null, "pattern", false);
runTest("Null pattern", "url", null, false);
runTest("Excessively long URL", "a".repeat(2001), "*a*", false);
runTest("Excessively long pattern", "url", "a".repeat(201), false);

// 5. Complex wildcards
runTest("Wildcard in middle", "https://www.google.com/search?q=test", "*google.com/search*", true);
runTest("Multiple wildcards", "https://github.com/user/repo", "https://github.com/*/*", true);
runTest("Interleaved wildcards", "https://github.com/user/repo", "*github*/*repo*", true);
runTest("Many wildcards", "https://example.com/a/b/c/d", "*a*b*c*d", true);

// 6. Consecutive wildcards
runTest("Consecutive wildcards in pattern", "https://example.com", "**example**", true);

// 7. Non-matching complex patterns
runTest("Trailing match failure", "https://example.com/foo", "https://example.com/bar*", false);
runTest("Substring match failure", "https://example.com/foo", "*bar*", false);

// 8. Caching logic (internal test implicitly covered if repeated calls work)
runTest("Repeated call 1 (Caching)", "http://example.com/cache1", "*cache1", true);
runTest("Repeated call 2 (Caching)", "http://example.com/cache1", "*cache1", true);

console.log(`Tests finished: ${testsPassed} passed, ${testsFailed} failed.`);

if (testsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
