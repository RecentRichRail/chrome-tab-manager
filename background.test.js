const fs = require('fs');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert');

test('background.js activateTab error path', async () => {
  const code = fs.readFileSync('background.js', 'utf8');

  const listeners = [];
  const chrome = {
    runtime: {
      onMessage: {
        addListener: (fn) => listeners.push(fn)
      },
      onStartup: { addListener: () => {} },
      onInstalled: { addListener: () => {} },
      getURL: (path) => 'chrome-extension://dummy/' + path
    },
    storage: {
      onChanged: { addListener: () => {} },
      sync: { get: async () => ({}), set: async () => {} },
      local: { get: async () => ({}), set: async () => {} }
    },
    tabs: {
      onCreated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onActivated: { addListener: () => {} },
      query: async () => []
    },
    windows: {
      onCreated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onBoundsChanged: { addListener: () => {} }
    },
    tabGroups: {
      onCreated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} }
    },
    action: {
      setBadgeText: async () => {},
      setBadgeBackgroundColor: async () => {}
    },
    scripting: {
      executeScript: async () => {}
    }
  };

  const context = vm.createContext({
    chrome,
    console: { log: () => {}, error: () => {}, warn: () => {} },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    Date,
    Math,
    Number,
    String,
    Object,
    Array,
    Promise,
    Map,
    Set,
    crypto: require('crypto'),
    window: {}
  });

  vm.runInContext(code, context);

  // We can trigger an error by defining a getter for tabId that throws
  const request = { type: 'activateTab' };
  Object.defineProperty(request, 'tabId', {
    get: () => { throw new Error('Simulated error for testing error path'); }
  });

  let responseObj = null;
  const sendResponse = (res) => {
    responseObj = res;
  };

  // Find the listener that handles messages (we mock sender.url to match getURL)
  for (const listener of listeners) {
    listener(request, { url: 'chrome-extension://dummy/popup.html' }, sendResponse);
  }

  // Give it a moment to run async code
  await new Promise(resolve => setTimeout(resolve, 50));

  assert.ok(responseObj, 'sendResponse should be called');
  assert.strictEqual(responseObj.ok, false, 'Response should have ok: false');
  assert.strictEqual(responseObj.error, 'Simulated error for testing error path', 'Response should contain the error message');
});
