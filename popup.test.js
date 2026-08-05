const { test, describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, 'popup.js'), 'utf8');
const scriptCode = code + `
  module.exports = {
    escapeHtml,
    autoCloseSettings,
    duplicatePreventionSettings,
    autoCollapseSettings,
    autoTabGroupingSettings
  };
`;

describe('popup.js', () => {
  let moduleExports;
  let context;

  beforeEach(() => {
    moduleExports = {};
    context = vm.createContext({
      module: { exports: moduleExports },
      document: {
        addEventListener: () => {},
        getElementById: (id) => ({
          addEventListener: () => {},
          value: '',
          checked: false,
          style: {},
          classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
          innerHTML: '',
          appendChild: () => {},
          removeChild: () => {},
          setAttribute: () => {},
          removeAttribute: () => {},
          textContent: ''
        }),
        querySelectorAll: () => [],
        createElement: () => ({
          classList: { add: () => {}, remove: () => {} },
          appendChild: () => {},
          setAttribute: () => {},
          addEventListener: () => {},
          style: {}
        }),
        body: {
          classList: { add: () => {}, remove: () => {} }
        }
      },
      window: {
        addEventListener: () => {},
        matchMedia: () => ({ matches: false, addEventListener: () => {} }),
        close: () => {},
        requestAnimationFrame: (cb) => cb()
      },
      chrome: {
        tabs: {
          query: async () => [],
          onCreated: { addListener: () => {} },
          onRemoved: { addListener: () => {} },
          onUpdated: { addListener: () => {} },
          create: async () => {},
          remove: async () => {},
          update: async () => {}
        },
        tabGroups: {
          onCreated: { addListener: () => {} },
          onRemoved: { addListener: () => {} },
          onUpdated: { addListener: () => {} },
        },
        storage: {
          local: { get: async () => ({}), set: async () => {} },
          sync: { get: async () => ({}), set: async () => {} }
        },
        runtime: {
          onMessage: { addListener: () => {} },
          getManifest: () => ({ version: '1.0' }),
          sendMessage: async () => {}
        },
        windows: {
          getAll: async () => [],
          update: async () => {},
          getCurrent: async () => ({ id: 1 })
        }
      },
      String: String,
      console: console,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      Math: Math,
      Array: Array
    });
    vm.runInContext(scriptCode, context);
    moduleExports = context.module.exports;
  });

  describe('escapeHtml', () => {
    it('should handle undefined and null', () => {
      assert.strictEqual(moduleExports.escapeHtml(undefined), 'undefined');
      assert.strictEqual(moduleExports.escapeHtml(null), 'null');
    });

    it('should escape &', () => {
      assert.strictEqual(moduleExports.escapeHtml('&'), '&amp;');
    });
    it('should escape < and >', () => {
      assert.strictEqual(moduleExports.escapeHtml('<script>'), '&lt;script&gt;');
    });
    it('should escape quotes', () => {
      assert.strictEqual(moduleExports.escapeHtml('"test" \'test\''), '&quot;test&quot; &#39;test&#39;');
    });

    it('should handle combinations of HTML characters', () => {
      assert.strictEqual(
        moduleExports.escapeHtml('<script>alert("XSS & \'test\'")</script>'),
        '&lt;script&gt;alert(&quot;XSS &amp; &#39;test&#39;&quot;)&lt;/script&gt;'
      );
    });

    it('should not change string without HTML characters', () => {
      assert.strictEqual(moduleExports.escapeHtml('Hello World! 123'), 'Hello World! 123');
    });

    it('should handle non-string inputs', () => {
      assert.strictEqual(moduleExports.escapeHtml(123), '123');
      assert.strictEqual(moduleExports.escapeHtml({}), '[object Object]');
      assert.strictEqual(moduleExports.escapeHtml(true), 'true');
    });
  });

  describe('Settings Objects', () => {
    it('should initialize autoCloseSettings', () => {
      assert.ok(moduleExports.autoCloseSettings !== undefined, 'autoCloseSettings is undefined');
      assert.strictEqual(moduleExports.autoCloseSettings.autoCloseEnabled, false);
      assert.strictEqual(moduleExports.autoCloseSettings.closeDelay, 5);
      assert.strictEqual(Array.isArray(moduleExports.autoCloseSettings.urlPatterns), true);
      assert.strictEqual(moduleExports.autoCloseSettings.urlPatterns.length, 0);
      assert.strictEqual(moduleExports.autoCloseSettings.autoCloseBannerEnabled, true);
    });

    it('should initialize duplicatePreventionSettings', () => {
      assert.ok(moduleExports.duplicatePreventionSettings !== undefined, 'duplicatePreventionSettings is undefined');
      assert.strictEqual(moduleExports.duplicatePreventionSettings.duplicatePreventionEnabled, true);
      assert.strictEqual(moduleExports.duplicatePreventionSettings.closeOlderTab, false);
      assert.strictEqual(Array.isArray(moduleExports.duplicatePreventionSettings.allowedDuplicatePatterns), true);
      assert.strictEqual(moduleExports.duplicatePreventionSettings.allowedDuplicatePatterns.length, 0);
      assert.strictEqual(moduleExports.duplicatePreventionSettings.duplicateBannerEnabled, true);
      assert.strictEqual(moduleExports.duplicatePreventionSettings.duplicateBannerDelaySeconds, 5);
    });

    it('should initialize autoCollapseSettings', () => {
      assert.ok(moduleExports.autoCollapseSettings !== undefined, 'autoCollapseSettings is undefined');
      assert.strictEqual(moduleExports.autoCollapseSettings.autoCollapseEnabled, true);
      assert.strictEqual(moduleExports.autoCollapseSettings.collapseDelay, 3);
    });

    it('should initialize autoTabGroupingSettings', () => {
      assert.ok(moduleExports.autoTabGroupingSettings !== undefined, 'autoTabGroupingSettings is undefined');
      assert.strictEqual(moduleExports.autoTabGroupingSettings.autoTabGroupingEnabled, true);
      assert.strictEqual(moduleExports.autoTabGroupingSettings.applyToGroupedTabs, false);
      assert.strictEqual(moduleExports.autoTabGroupingSettings.ignorePinnedTabs, true);
      assert.strictEqual(moduleExports.autoTabGroupingSettings.addTabPosition, 'right');
      assert.strictEqual(moduleExports.autoTabGroupingSettings.autoCloseSingleTabGroups, true);
      assert.strictEqual(Array.isArray(moduleExports.autoTabGroupingSettings.tabGroupRules), true);
      assert.strictEqual(moduleExports.autoTabGroupingSettings.tabGroupRules.length, 0);
    });
  });
});
