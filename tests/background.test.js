const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Read the background.js file
const backgroundCode = fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8');

// We need to mock 'chrome' and DOM globals if needed
const chrome = {
  storage: {
    sync: { get: () => Promise.resolve({}), set: () => Promise.resolve({}) },
    onChanged: { addListener: () => {} }
  },
  runtime: {
    onMessage: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
    getURL: () => ''
  },
  tabs: {
    query: () => Promise.resolve([]),
    onUpdated: { addListener: () => {} },
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onActivated: { addListener: () => {} }
  },
  windows: {
    onRemoved: { addListener: () => {} },
    onCreated: { addListener: () => {} },
    onBoundsChanged: { addListener: () => {} }
  },
  tabGroups: {
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onUpdated: { addListener: () => {} }
  }
};

global.chrome = chrome;

eval(backgroundCode);

console.log("Functions loaded.");

// Test normalizeUrl
function testNormalizeUrl() {
  console.log("Testing normalizeUrl...");

  // Happy path
  const validUrl = "https://example.com/path?param=1#hash";
  const expectedValidUrl = "https://example.com/path?param=1";
  const result1 = normalizeUrl(validUrl);
  assert.strictEqual(result1, expectedValidUrl, "Happy path failed");

  // Error path (invalid URL)
  // When 'new URL()' throws, the function should return the original string
  const invalidUrl = "not-a-valid-url";
  const result2 = normalizeUrl(invalidUrl);
  assert.strictEqual(result2, invalidUrl, "Error path for invalid string failed");

  // Edge case: URL object tampering to test error catch within the try block after new URL()
  // One way to test the try-catch error block is to mock the global URL class temporarily.
  const originalURL = global.URL;
  try {
    global.URL = class MockURL {
      constructor() {
        throw new Error("Mocked URL parse error");
      }
    };
    const result3 = normalizeUrl("http://example.com");
    assert.strictEqual(result3, "http://example.com", "Error path with mocked error failed");
  } finally {
    global.URL = originalURL;
  }

  console.log("normalizeUrl tests passed!");
}

try {
  testNormalizeUrl();
} catch (e) {
  console.error("Test failed:", e);
  process.exit(1);
}
// Clear timeouts to let node exit
setTimeout(() => {
  process.exit(0);
}, 100);
