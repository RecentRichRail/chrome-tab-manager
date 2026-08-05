const test = require('node:test');
const assert = require('node:assert');

// Simulate basic environment
global.document = {
    getElementById: (id) => {
        return {
            id,
            checked: false,
            value: '',
            addEventListener: () => {},
            style: {},
            classList: { contains: () => false, add: () => {}, remove: () => {} }
        };
    },
    addEventListener: () => {},
    createElement: (tag) => ({ tag, classList: { add: () => {} }, appendChild: () => {}, setAttribute: () => {} })
};
global.window = {
    addEventListener: () => {},
    setTimeout: () => {}
};
global.chrome = {
    tabs: {
        query: () => Promise.resolve([]),
        onRemoved: { addListener: () => {} },
        onUpdated: { addListener: () => {} },
        onCreated: { addListener: () => {} }
    },
    tabGroups: {
        onCreated: { addListener: () => {} },
        onRemoved: { addListener: () => {} },
        onUpdated: { addListener: () => {} }
    },
    storage: { local: { get: () => Promise.resolve({}), set: () => Promise.resolve() } },
    runtime: { getURL: () => '', onMessage: { addListener: () => {} } },
    action: { setBadgeText: () => {} }
};

const fs = require('fs');
let code = fs.readFileSync('popup.js', 'utf8');

code += `
if (typeof module !== 'undefined') {
  module.exports = {
    escapeHtml,
    autoCloseSettings,
    updateAutoCloseUI
  };
}
`;

const m = new module.constructor();
m.paths = module.paths;
m._compile(code, 'popup.js');
const popup = m.exports;

test('escapeHtml', () => {
    assert.strictEqual(popup.escapeHtml('hello'), 'hello');
    assert.strictEqual(popup.escapeHtml('hello & world'), 'hello &amp; world');
    assert.strictEqual(popup.escapeHtml('<script>'), '&lt;script&gt;');
});

test('autoCloseSettings initial state', () => {
    assert.strictEqual(popup.autoCloseSettings.autoCloseEnabled, false);
    assert.strictEqual(popup.autoCloseSettings.closeDelay, 5);
    assert.deepStrictEqual(popup.autoCloseSettings.urlPatterns, []);
});

test('updateAutoCloseUI updates DOM elements based on settings', () => {
    // Modify settings before update
    popup.autoCloseSettings.autoCloseEnabled = true;
    popup.autoCloseSettings.closeDelay = 10;

    // We mock getElementById to capture assignments
    let toggleChecked = false;
    let delayValue = '';

    global.document.getElementById = (id) => {
        if (id === 'autoCloseToggle') return { set checked(val) { toggleChecked = val; } };
        if (id === 'closeDelayInput') return { set value(val) { delayValue = val; } };
        return { checked: false, value: '' }; // Mock for other elements
    };

    popup.updateAutoCloseUI();

    assert.strictEqual(toggleChecked, true);
    assert.strictEqual(delayValue, 10);
});
