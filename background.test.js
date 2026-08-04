const fs = require('fs');
const test = require('node:test');
const assert = require('node:assert');

// Mock chrome API so background.js can load
global.chrome = {
  storage: { onChanged: { addListener: () => {} }, sync: { get: () => Promise.resolve({}) }, local: { get: () => Promise.resolve({}) } },
  tabs: { query: () => Promise.resolve([]), onUpdated: { addListener: () => {} }, onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onActivated: { addListener: () => {} } },
  windows: { onRemoved: { addListener: () => {} }, onCreated: { addListener: () => {} }, onBoundsChanged: { addListener: () => {} } },
  tabGroups: { onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onUpdated: { addListener: () => {} } },
  runtime: { onStartup: { addListener: () => {} }, onInstalled: { addListener: () => {} }, onMessage: { addListener: () => {} }, getURL: () => '' },
  action: { setBadgeText: () => {}, setBadgeBackgroundColor: () => {} }
};
global.crypto = { randomUUID: () => 'uuid' };

// Load the file in the global scope so functions are accessible
const bgCode = fs.readFileSync('./background.js', 'utf8');
eval(bgCode);

test('isAllowedDuplicate', async (t) => {
    // Suppress console.log during tests to avoid clutter
    const originalLog = console.log;
    console.log = () => {};

    await t.test('exact match', () => {
        assert.strictEqual(isAllowedDuplicate('https://example.com/page1', ['https://example.com/page1']), true);
        assert.strictEqual(isAllowedDuplicate('https://example.com/page2', ['https://example.com/page1']), false);
    });

    await t.test('wildcard match', () => {
        assert.strictEqual(isAllowedDuplicate('https://example.com/page1', ['*example.com*']), true);
        assert.strictEqual(isAllowedDuplicate('https://example.com/page1', ['https://example.com/*']), true);
        assert.strictEqual(isAllowedDuplicate('https://example.com/page1', ['*page2*']), false);
    });

    await t.test('normalized url (without hash)', () => {
        assert.strictEqual(isAllowedDuplicate('https://example.com/page#section1', ['https://example.com/page']), true);
        // Wildcard ignoring hash
        assert.strictEqual(isAllowedDuplicate('https://example.com/page#section2', ['*example.com/page']), true);
        // Match including hash
        assert.strictEqual(isAllowedDuplicate('https://example.com/page#section1', ['https://example.com/page#section1']), true);
    });

    await t.test('case insensitivity', () => {
        assert.strictEqual(isAllowedDuplicate('HTTPS://EXAMPLE.COM/page', ['https://example.com/page']), true);
        assert.strictEqual(isAllowedDuplicate('https://example.com/PAGE', ['https://example.com/page']), true);
        assert.strictEqual(isAllowedDuplicate('https://example.com/page', ['HTTPS://EXAMPLE.COM/PAGE']), true);
    });

    await t.test('empty patterns', () => {
        assert.strictEqual(isAllowedDuplicate('https://example.com/page', []), false);
    });

    await t.test('multiple patterns', () => {
        assert.strictEqual(isAllowedDuplicate('https://example.com/page', ['*test.com*', 'https://example.com/page']), true);
        assert.strictEqual(isAllowedDuplicate('https://example.com/page', ['*test.com*', '*other.com*']), false);
    });

    // Restore console.log
    console.log = originalLog;
});
