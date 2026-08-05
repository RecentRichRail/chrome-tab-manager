const assert = require('assert');
const { test } = require('node:test');

// Mock chrome API before requiring background.js
global.chrome = {
    storage: {
        onChanged: { addListener: () => {} },
        sync: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
        local: { get: () => Promise.resolve({}), set: () => Promise.resolve() }
    },
    tabs: {
        onCreated: { addListener: () => {} },
        onUpdated: { addListener: () => {} },
        onRemoved: { addListener: () => {} },
        onActivated: { addListener: () => {} },
        onReplaced: { addListener: () => {} },
        query: () => Promise.resolve([])
    },
    tabGroups: {
        onCreated: { addListener: () => {} },
        onUpdated: { addListener: () => {} },
        onRemoved: { addListener: () => {} },
        onMoved: { addListener: () => {} }
    },
    windows: {
        onCreated: { addListener: () => {} },
        onRemoved: { addListener: () => {} },
        onFocusChanged: { addListener: () => {} },
        onBoundsChanged: { addListener: () => {} }
    },
    action: {
        setBadgeText: () => Promise.resolve(),
        setBadgeBackgroundColor: () => Promise.resolve()
    },
    runtime: {
        onMessage: { addListener: () => {} },
        onStartup: { addListener: () => {} },
        onInstalled: { addListener: () => {} },
        getURL: () => ''
    },
    contextMenus: {
        create: () => {},
        onClicked: { addListener: () => {} }
    }
};

// Now it's safe to require
const { sanitizeUrlForLog } = require('../background.js');

test('sanitizeUrlForLog', async (t) => {
    await t.test('returns origin and pathname for a standard HTTP URL', () => {
        assert.strictEqual(sanitizeUrlForLog('http://example.com'), 'http://example.com/');
    });

    await t.test('strips query parameters from the URL', () => {
        assert.strictEqual(sanitizeUrlForLog('https://example.com/search?q=test&lang=en'), 'https://example.com/search');
    });

    await t.test('strips hash fragments from the URL', () => {
        assert.strictEqual(sanitizeUrlForLog('https://example.com/page#section2'), 'https://example.com/page');
    });

    await t.test('strips both query parameters and hash fragments', () => {
        assert.strictEqual(sanitizeUrlForLog('https://example.com/page?q=1#top'), 'https://example.com/page');
    });

    await t.test('strips credentials (username and password) from the URL', () => {
        assert.strictEqual(sanitizeUrlForLog('https://user:pass@example.com/secure'), 'https://example.com/secure');
    });

    await t.test('handles empty string', () => {
        assert.strictEqual(sanitizeUrlForLog(''), '');
    });

    await t.test('handles null input', () => {
        assert.strictEqual(sanitizeUrlForLog(null), 'null');
    });

    await t.test('handles undefined input', () => {
        assert.strictEqual(sanitizeUrlForLog(undefined), 'undefined');
    });

    await t.test('returns redacted string for invalid URLs', () => {
        assert.strictEqual(sanitizeUrlForLog('not-a-valid-url'), '[invalid/redacted url]');
    });

    await t.test('returns redacted string for URL with only a path', () => {
        assert.strictEqual(sanitizeUrlForLog('/just/a/path'), '[invalid/redacted url]');
    });
});
