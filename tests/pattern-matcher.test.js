const assert = require('assert');
const { loadBackgroundScript } = require('./test-framework.js');

const { matchesPattern, patternParseCache, MAX_PATTERN_CACHE_SIZE } = loadBackgroundScript();

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    failed++;
  }
}

function clearCache() {
  patternParseCache.clear();
}

console.log('Running pattern matcher tests...');

test('Basic matches', () => {
  clearCache();
  assert.strictEqual(matchesPattern('https://github.com/test', '*github.com*'), true);
  assert.strictEqual(matchesPattern('https://gitlab.com/test', '*github.com*'), false);
  assert.strictEqual(matchesPattern('https://docs.google.com/test', '*docs.google.com*'), true);
  assert.strictEqual(matchesPattern('https://localhost:3000', 'https://localhost*'), true);
  assert.strictEqual(matchesPattern('https://example.com', 'https://example.com'), true);
});

test('Edge cases - Empty strings', () => {
  clearCache();
  assert.strictEqual(matchesPattern('', '*test*'), false);
  assert.strictEqual(matchesPattern('https://test.com', ''), false);
  assert.strictEqual(matchesPattern('', ''), false);
  assert.strictEqual(matchesPattern(null, '*test*'), false);
  assert.strictEqual(matchesPattern('https://test.com', null), false);
});

test('Edge cases - Excessive length (DoS mitigation)', () => {
  clearCache();
  const longUrl = 'A'.repeat(2001);
  const longPattern = 'A'.repeat(201);
  assert.strictEqual(matchesPattern(longUrl, '*test*'), false);
  assert.strictEqual(matchesPattern('https://test.com', longPattern), false);
});

test('Multiple wildcards', () => {
  clearCache();
  assert.strictEqual(matchesPattern('https://test.com', '*test**com*'), true);
  assert.strictEqual(matchesPattern('https://test.com', '***test.com***'), true);
  assert.strictEqual(matchesPattern('abc', '*a*b*c*'), true);
  assert.strictEqual(matchesPattern('abc', '*a*c*b*'), false); // Wrong order
  assert.strictEqual(matchesPattern('https://sub.domain.com/path', '*.domain.com/*'), true);
});

test('Exact matches without wildcards', () => {
  clearCache();
  assert.strictEqual(matchesPattern('https://test.com', 'https://test.com'), true);
  assert.strictEqual(matchesPattern('https://test.com/', 'https://test.com'), false); // Exact match requires exact equality
  assert.strictEqual(matchesPattern('https://test.com', 'https://test.com/'), false);
  assert.strictEqual(matchesPattern('HTTPS://TEST.COM', 'https://test.com'), true); // Case insensitive
});

test('Cache functionality', () => {
  clearCache();
  // Call twice with the same pattern to test cache hit
  assert.strictEqual(matchesPattern('https://test.com', '*test*'), true);
  assert.strictEqual(matchesPattern('https://example.com', '*test*'), false);

  // Fill the cache up to MAX_PATTERN_CACHE_SIZE
  for (let i = 0; i < MAX_PATTERN_CACHE_SIZE + 10; i++) {
    matchesPattern(`https://test${i}.com`, `*test${i}*`);
  }

  // Cache size should be capped
  assert.strictEqual(patternParseCache.size, MAX_PATTERN_CACHE_SIZE);

  // The first pattern should have been evicted
  assert.strictEqual(patternParseCache.has('*test*'), false);
});

test('Invalid URLs', () => {
  clearCache();
  assert.strictEqual(matchesPattern('invalid-url', '*valid*'), true);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
