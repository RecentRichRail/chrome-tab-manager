const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');

global.chrome = {
  storage: { onChanged: { addListener: () => {} }, sync: {}, local: {} },
  tabs: { onUpdated: { addListener: () => {} }, onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onActivated: { addListener: () => {} }, query: () => {} },
  windows: { onRemoved: { addListener: () => {} }, onCreated: { addListener: () => {} }, onBoundsChanged: { addListener: () => {} } },
  runtime: { onStartup: { addListener: () => {} }, onInstalled: { addListener: () => {} }, onMessage: { addListener: () => {} }, getURL: () => '' },
  tabGroups: { onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onUpdated: { addListener: () => {} } },
  action: { setBadgeText: () => {}, setBadgeBackgroundColor: () => {} }
};
global.crypto = { randomUUID: () => 'uuid' };

const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

global.setTimeout = () => {};
global.clearTimeout = () => {};
global.setInterval = () => {};
global.clearInterval = () => {};

try {
  eval(code);
} finally {
  global.setTimeout = originalSetTimeout;
  global.clearTimeout = originalClearTimeout;
  global.setInterval = originalSetInterval;
  global.clearInterval = originalClearInterval;
}

test('matchesPattern - Basic exact matches', () => {
  assert.strictEqual(matchesPattern('https://example.com', 'https://example.com'), true);
  assert.strictEqual(matchesPattern('https://example.com', 'https://example.org'), false);
});

test('matchesPattern - Case insensitivity', () => {
  assert.strictEqual(matchesPattern('https://EXamPle.com', 'https://example.com'), true);
  assert.strictEqual(matchesPattern('https://example.com', 'https://EXamPle.com'), true);
});

test('matchesPattern - Wildcard at start', () => {
  assert.strictEqual(matchesPattern('https://example.com/login', '*login'), true);
  assert.strictEqual(matchesPattern('https://example.com/logout', '*login'), false);
});

test('matchesPattern - Wildcard at end', () => {
  assert.strictEqual(matchesPattern('https://example.com/login', 'https://example.com*'), true);
  assert.strictEqual(matchesPattern('https://example.org/login', 'https://example.com*'), false);
});

test('matchesPattern - Wildcard in middle', () => {
  assert.strictEqual(matchesPattern('https://example.com/auth/login', 'https://example.com/*/login'), true);
  assert.strictEqual(matchesPattern('https://example.com/auth/logout', 'https://example.com/*/login'), false);
});

test('matchesPattern - Multiple wildcards', () => {
  assert.strictEqual(matchesPattern('https://app.example.com/v1/users', '*example.com/*/users*'), true);
  assert.strictEqual(matchesPattern('https://app.example.org/v1/users', '*example.com/*/users*'), false);
});

test('matchesPattern - DoS limits and invalid inputs', () => {
  assert.strictEqual(matchesPattern('', '*'), false);
  assert.strictEqual(matchesPattern('https://example.com', ''), false);

  const longUrl = 'https://example.com/' + 'a'.repeat(2001);
  assert.strictEqual(matchesPattern(longUrl, '*a*'), false);

  const longPattern = '*' + 'a'.repeat(201) + '*';
  assert.strictEqual(matchesPattern('https://example.com', longPattern), false);
});

test('matchesPattern - Edge case: overlapping characters', () => {
  assert.strictEqual(matchesPattern('a', 'a*a'), false);
  assert.strictEqual(matchesPattern('aa', 'a*a'), true);
  assert.strictEqual(matchesPattern('aab', '*a*ab*'), true);
});

test('matchesPattern - Edge case: Consecutive wildcards', () => {
  assert.strictEqual(matchesPattern('abc', 'a**c'), true);
  assert.strictEqual(matchesPattern('abc', '***b***'), true);
});

test('matchesPattern - Invalid URL type handling', () => {
  assert.strictEqual(matchesPattern(null, '*'), false);
  assert.strictEqual(matchesPattern(undefined, '*'), false);
});

test('matchesPattern - explicit cachedLowerUrl', () => {
  assert.strictEqual(matchesPattern('https://example.com/login', '*login', 'https://example.com/login'), true);
  // It should use the provided string rather than calculating `.toLowerCase()` again
  assert.strictEqual(matchesPattern('https://ExAmPlE.com', 'https://example.com', 'https://example.com'), true);
});

test('matchesPattern - special characters as string literals', () => {
  assert.strictEqual(matchesPattern('https://example.com/?q=1', 'https://example.com/?q=1'), true);
  assert.strictEqual(matchesPattern('https://example.com/a', 'https://example.com/?'), false);

  assert.strictEqual(matchesPattern('https://example.com/a.b', '*a.b*'), true);
  assert.strictEqual(matchesPattern('https://example.com/aXb', '*a.b*'), false);
});

test('matchesPattern - Pattern Parse Cache size limit', () => {
  // Add 505 unique patterns to check that eviction works
  // Cache max size is 500
  for (let i = 0; i < 505; i++) {
    matchesPattern('http://example.com', `pattern_${i}`);
  }

  // The first pattern 'pattern_0' should have been evicted
  // However, there's no public API to directly verify map size,
  // we just test it doesn't crash and returns expected results
  assert.strictEqual(matchesPattern('http://example.com', 'pattern_0'), false);
});

test('matchesPattern - trailing characters check', () => {
  // For patterns like *ab*cd where the url ends with cd
  assert.strictEqual(matchesPattern('xabycd', '*ab*cd'), true);

  // But if the ending overlaps the current index we should handle it
  // Pattern: *a*a
  // Url: ba
  // The first 'a' is matched at index 1, currentIndex = 2
  // Then lastPart is 'a'. Url length (2) - lastPart length (1) = 1
  // currentIndex (2) > 1, so it returns false!
  // Is this right? Let's trace it.
  // parts = ['', 'a', 'a']. lowerParts = ['', 'a', 'a'].
  // i=1 part='a', foundIndex=1, currentIndex=2
  // lastPart='a', lowerUrl.endsWith('a') is true. lowerUrl.length(2) - lastPart.length(1) < currentIndex(2).
  // returns false.
  // So 'ba' doesn't match '*a*a'.
  // However, it's correct because the first '*a' matches 'ba' (consuming 'a'),
  // leaving '' for the second '*a', which cannot match 'a'.
  assert.strictEqual(matchesPattern('ba', '*a*a'), false);

  // What about 'baa'?
  assert.strictEqual(matchesPattern('baa', '*a*a'), true);
});
