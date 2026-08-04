const assert = require('node:assert');
const { describe, it, before, beforeEach } = require('node:test');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

describe('popup.js tests', () => {
  let context;
  let domElements = {};

  before(() => {
    const popupCode = fs.readFileSync(path.join(__dirname, '../popup.js'), 'utf8');

    const domMock = {
      getElementById: (id) => {
                if (!domElements[id]) {
          domElements[id] = {
            checked: false,
            value: '',
            addEventListener: () => {},
            innerHTML: '',
            style: {},
            appendChild: () => {},
            classList: { add: ()=>{}, remove: ()=>{} },
            getAttribute: () => ''
          };
        }
        return domElements[id];
      },
      addEventListener: () => {},
      querySelectorAll: () => [],
      createElement: () => ({ addEventListener: () => {}, appendChild: () => {}, style: {}, classList: { add: ()=>{}, remove: ()=>{} }, setAttribute: () => {} })
    };

    context = vm.createContext({
      document: domMock,
      window: { addEventListener: () => {} },
      chrome: {
        tabs: { onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onUpdated: { addListener: () => {} }, query: async () => [] },
        tabGroups: { onCreated: { addListener: () => {} }, onRemoved: { addListener: () => {} }, onUpdated: { addListener: () => {} } },
        storage: { local: { get: async () => ({}), set: async () => {} } },
        runtime: { sendMessage: async () => {}, onMessage: { addListener: () => {} }, getURL: () => '' },
        action: { setBadgeText: () => {}, setBadgeBackgroundColor: () => {} }
      },
      setTimeout: () => {},
      clearTimeout: () => {},
      console: { log: () => {}, error: () => {}, warn: () => {} },
      parseInt: parseInt,
      String: String
    });

    vm.runInContext(popupCode, context);
  });

  beforeEach(() => {
        context.updateUrlList = () => {};
    context.updateDuplicateAllowList = () => {};
    context.updateGroupRuleList = () => {};
  });

  describe('escapeHtml', () => {
    it('should escape & character', () => {
      assert.strictEqual(context.escapeHtml('foo & bar'), 'foo &amp; bar');
    });

    it('should escape < and > characters', () => {
      assert.strictEqual(context.escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('should escape double quotes', () => {
      assert.strictEqual(context.escapeHtml('hello "world"'), 'hello &quot;world&quot;');
    });

    it('should escape single quotes', () => {
      assert.strictEqual(context.escapeHtml("hello 'world'"), 'hello &#39;world&#39;');
    });
  });

  describe('UI Interaction Logic', () => {
    it('should update DOM elements according to autoCloseSettings', async () => {
      context.updateAutoCloseUI();
      // In vm context, let variables are not exposed on context.
      // But we can just eval code in context to assign them.
      require('vm').runInContext(`
        autoCloseSettings.autoCloseEnabled = true;
        autoCloseSettings.closeDelay = 15;
        autoCloseSettings.autoCloseBannerEnabled = false;
        updateAutoCloseUI();
      `, context);
      assert.strictEqual(domElements['autoCloseToggle'].checked, true);
      assert.strictEqual(domElements['closeDelayInput'].value, 15);
      assert.strictEqual(domElements['autoCloseBannerToggle'].checked, false);
    });

    it('should update DOM elements according to duplicatePreventionSettings', async () => {
      context.updateDuplicatePreventionUI();
      require('vm').runInContext(`
        duplicatePreventionSettings.duplicatePreventionEnabled = true;
        duplicatePreventionSettings.closeOlderTab = true;
        duplicatePreventionSettings.duplicateBannerEnabled = false;
        duplicatePreventionSettings.duplicateBannerDelaySeconds = 7;
        updateDuplicatePreventionUI();
      `, context);
      assert.strictEqual(domElements['duplicatePreventionToggle'].checked, true);
      assert.strictEqual(domElements['duplicateActionSelect'].value, "true");
      assert.strictEqual(domElements['duplicateBannerToggle'].checked, false);
      assert.strictEqual(domElements['duplicateBannerDelayInput'].value, 7);
    });

    it('should update DOM elements according to autoCollapseSettings', async () => {
      context.updateAutoCollapseUI();
      require('vm').runInContext(`
        autoCollapseSettings.autoCollapseEnabled = false;
        autoCollapseSettings.collapseDelay = 12;
        updateAutoCollapseUI();
      `, context);
      assert.strictEqual(domElements['autoCollapseToggle'].checked, false);
      assert.strictEqual(domElements['collapseDelayInput'].value, 12);
    });

    it('should update DOM elements according to autoTabGroupingSettings', async () => {
      context.updateAutoTabGroupingUI();
      require('vm').runInContext(`
        autoTabGroupingSettings.autoTabGroupingEnabled = true;
        autoTabGroupingSettings.applyToGroupedTabs = false;
        autoTabGroupingSettings.ignorePinnedTabs = true;
        autoTabGroupingSettings.addTabPosition = 'right';
        autoTabGroupingSettings.autoCloseSingleTabGroups = false;
        updateAutoTabGroupingUI();
      `, context);
      assert.strictEqual(domElements['autoTabGroupingToggle'].checked, true);
      assert.strictEqual(domElements['applyToGroupedTabsToggle'].checked, false);
      assert.strictEqual(domElements['ignorePinnedTabsToggle'].checked, true);
      assert.strictEqual(domElements['addTabPositionSelect'].value, 'right');
      assert.strictEqual(domElements['autoCloseSingleTabGroupsToggle'].checked, false);
    });
  });
});
