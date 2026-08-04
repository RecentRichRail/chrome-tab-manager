// Basic custom test runner without jest
const fs = require('fs');

// Create mock environment
global.chrome = {
  storage: {
    onChanged: { addListener: () => {} },
    sync: { get: () => Promise.resolve({}), set: () => Promise.resolve({}) },
    local: { get: () => Promise.resolve({}), set: () => Promise.resolve({}) }
  },
  tabs: {
    onCreated: { addListener: () => {} },
    onUpdated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onActivated: { addListener: () => {} },
    query: () => Promise.resolve([]),
    get: () => Promise.resolve({}),
    group: () => Promise.resolve(),
    move: () => Promise.resolve(),
    remove: () => Promise.resolve()
  },
  tabGroups: {
    onCreated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    onUpdated: { addListener: () => {} },
    query: () => Promise.resolve([]),
    update: () => Promise.resolve()
  },
  windows: {
    onCreated: { addListener: () => {} },
    onFocusChanged: { addListener: () => {} },
    onBoundsChanged: { addListener: () => {} },
    onRemoved: { addListener: () => {} }
  },
  runtime: {
    onMessage: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} }
  },
  action: {
    setBadgeText: () => {},
    setBadgeBackgroundColor: () => {}
  },
  commands: {
    onCommand: { addListener: () => {} }
  }
};

// Load the file using eval to inject the environment
const code = fs.readFileSync('./background.js', 'utf8');

// We need to export normalizeUrl to test it
const modifiedCode = code + '\nmodule.exports = { normalizeUrl };\n';

let normalizeUrl;

try {
  // Use a Function wrapper to evaluate the code in current context and return module.exports
  const initModule = new Function('module', 'global', 'chrome', modifiedCode + ' return module.exports;');
  const m = { exports: {} };
  const exported = initModule(m, global, global.chrome);
  normalizeUrl = exported.normalizeUrl;
} catch (e) {
  console.error("Failed to load background.js:", e);
  process.exit(1);
}

// Test Suite
console.log('🧪 Testing normalizeUrl...');
let passed = 0;
let total = 0;

function expect(actual, expected, name) {
  total++;
  if (actual === expected) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    console.log(`     Expected: ${expected}`);
    console.log(`     Actual:   ${actual}`);
  }
}

// Test cases
expect(normalizeUrl('https://example.com/page#section'), 'https://example.com/page', 'Removes hash fragment');
expect(normalizeUrl('https://example.com/page?query=1#section'), 'https://example.com/page?query=1', 'Preserves query params while removing hash');
expect(normalizeUrl('https://example.com'), 'https://example.com/', 'Adds trailing slash for base domains');
expect(normalizeUrl('not-a-valid-url'), 'not-a-valid-url', 'Returns original string on invalid URL');
expect(normalizeUrl(''), '', 'Handles empty string gracefully');

console.log(`\nResult: ${passed}/${total} passed.`);
if (passed !== total) {
  process.exit(1);
}
