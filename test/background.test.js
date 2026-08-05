const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('./background.js', 'utf8');

function createSandbox() {
  const chrome = {
    tabs: {
      onCreated: { addListener: () => {} },
      onUpdated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onActivated: { addListener: () => {} },
      onAttached: { addListener: () => {} },
      onDetached: { addListener: () => {} },
      onReplaced: { addListener: () => {} },
      query: async () => [],
      get: async () => ({}),
      remove: async () => {},
      update: async () => {}
    },
    tabGroups: {
      onUpdated: { addListener: () => {} },
      onCreated: { addListener: () => {} },
      onRemoved: { addListener: () => {} }
    },
    windows: {
      onCreated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onFocusChanged: { addListener: () => {} },
      onBoundsChanged: { addListener: () => {} },
      update: async () => {}
    },
    storage: {
      onChanged: { addListener: () => {} },
      sync: { get: async () => ({}), set: async () => {} },
      local: { get: async () => ({}), set: async () => {} }
    },
    runtime: {
      onMessage: { addListener: () => {} },
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      getURL: () => ''
    },
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {}
    },
    alarms: {
      onAlarm: { addListener: () => {} },
      create: () => {},
      clear: () => {}
    }
  };

  const logs = [];
  const errors = [];

  const codeToRun = code + `
    if (typeof performDuplicateDefaultAction !== 'undefined') {
      sandboxExports.performDuplicateDefaultAction = performDuplicateDefaultAction;
    }
    if (typeof tabUrlMap !== 'undefined') {
      sandboxExports.tabUrlMap = tabUrlMap;
    }
  `;

  const sandboxExports = {};

  const sandbox = {
    chrome,
    console: {
      log: (...args) => logs.push(args),
      warn: (...args) => logs.push(args),
      error: (...args) => errors.push(args)
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL: URL,
    Map: Map,
    Set: Set,
    sandboxExports
  };

  vm.createContext(sandbox);
  vm.runInContext(codeToRun, sandbox);

  return { sandbox: sandboxExports, chrome, errors };
}

test('performDuplicateDefaultAction - happy path closes older (keeps new tab)', async () => {
  const { sandbox, chrome } = createSandbox();

  let removedTabId = null;
  chrome.tabs.remove = async (id) => { removedTabId = id; };

  await sandbox.performDuplicateDefaultAction({
    newTabId: 100,
    existingTabId: 50,
    defaultClosesOlder: true,
    normalizedUrl: 'https://example.com'
  });

  assert.strictEqual(removedTabId, 50, 'Should remove the existing (older) tab');
  assert.strictEqual(sandbox.tabUrlMap.get('https://example.com'), 100, 'Should keep newTabId in map');
});

test('performDuplicateDefaultAction - happy path closes newer (focuses existing, closes new)', async () => {
  const { sandbox, chrome } = createSandbox();

  let removedTabId = null;
  let focusedWindowId = null;
  let activatedTabId = null;

  chrome.tabs.remove = async (id) => { removedTabId = id; };
  chrome.tabs.get = async (id) => {
    if (id === 50) return { windowId: 1 };
    throw new Error('Not found');
  };
  chrome.windows.update = async (windowId, updateInfo) => {
    focusedWindowId = windowId;
    assert.strictEqual(updateInfo.focused, true);
  };
  chrome.tabs.update = async (tabId, updateInfo) => {
    activatedTabId = tabId;
    assert.strictEqual(updateInfo.active, true);
  };

  await sandbox.performDuplicateDefaultAction({
    newTabId: 100,
    existingTabId: 50,
    defaultClosesOlder: false,
    normalizedUrl: 'https://example.com'
  });

  assert.strictEqual(focusedWindowId, 1, 'Should focus the window of the existing tab');
  assert.strictEqual(activatedTabId, 50, 'Should activate the existing tab');
  assert.strictEqual(removedTabId, 100, 'Should remove the new (newer) tab');
  assert.strictEqual(sandbox.tabUrlMap.get('https://example.com'), 50, 'Should keep existingTabId in map');
});

test('performDuplicateDefaultAction - error path (chrome.tabs.remove throws)', async () => {
  const { sandbox, chrome, errors } = createSandbox();

  chrome.tabs.remove = async (id) => { throw new Error('Simulated remove error'); };

  // Should not throw to the caller
  await assert.doesNotReject(async () => {
    await sandbox.performDuplicateDefaultAction({
      newTabId: 100,
      existingTabId: 50,
      defaultClosesOlder: true,
      normalizedUrl: 'https://example.com'
    });
  });

  assert.strictEqual(sandbox.tabUrlMap.get('https://example.com'), 100);
});

test('performDuplicateDefaultAction - error path (chrome.tabs.get throws)', async () => {
  const { sandbox, chrome } = createSandbox();

  chrome.tabs.get = async (id) => { throw new Error('Simulated get error'); };

  let removedTabId = null;
  chrome.tabs.remove = async (id) => { removedTabId = id; };

  await assert.doesNotReject(async () => {
    await sandbox.performDuplicateDefaultAction({
      newTabId: 100,
      existingTabId: 50,
      defaultClosesOlder: false,
      normalizedUrl: 'https://example.com'
    });
  });

  // Even if get fails, we still try to remove the new tab
  assert.strictEqual(removedTabId, 100);
});

test('performDuplicateDefaultAction - error path (chrome.windows.update throws)', async () => {
  const { sandbox, chrome } = createSandbox();

  chrome.tabs.get = async (id) => ({ windowId: 1 });
  chrome.windows.update = async () => { throw new Error('Simulated windows update error'); };

  let activatedTabId = null;
  let removedTabId = null;
  chrome.tabs.update = async (tabId, updateInfo) => { activatedTabId = tabId; };
  chrome.tabs.remove = async (id) => { removedTabId = id; };

  await assert.doesNotReject(async () => {
    await sandbox.performDuplicateDefaultAction({
      newTabId: 100,
      existingTabId: 50,
      defaultClosesOlder: false,
      normalizedUrl: 'https://example.com'
    });
  });

  // Even if windows.update fails, we still try to activate the tab and remove the new one
  assert.strictEqual(activatedTabId, 50);
  assert.strictEqual(removedTabId, 100);
});

test('performDuplicateDefaultAction - error path (chrome.tabs.update throws)', async () => {
  const { sandbox, chrome } = createSandbox();

  chrome.tabs.get = async (id) => ({ windowId: 1 });
  chrome.windows.update = async () => {};
  chrome.tabs.update = async () => { throw new Error('Simulated tabs update error'); };

  let removedTabId = null;
  chrome.tabs.remove = async (id) => { removedTabId = id; };

  await assert.doesNotReject(async () => {
    await sandbox.performDuplicateDefaultAction({
      newTabId: 100,
      existingTabId: 50,
      defaultClosesOlder: false,
      normalizedUrl: 'https://example.com'
    });
  });

  // Even if tabs.update fails, we still try to remove the new tab
  assert.strictEqual(removedTabId, 100);
});

test('performDuplicateDefaultAction - outer error path (tabUrlMap throws)', async () => {
  const { sandbox, errors } = createSandbox();

  sandbox.tabUrlMap.set = () => { throw new Error('Simulated map error'); };

  await assert.doesNotReject(async () => {
    await sandbox.performDuplicateDefaultAction({
      newTabId: 100,
      existingTabId: 50,
      defaultClosesOlder: true,
      normalizedUrl: 'https://example.com'
    });
  });

  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0][0], 'performDuplicateDefaultAction failed');
});
