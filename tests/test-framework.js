const fs = require('fs');
const path = require('path');

function loadBackgroundScript() {
  const bgPath = path.join(__dirname, '../background.js');
  const code = fs.readFileSync(bgPath, 'utf8');

  const mockGlobal = {
    chrome: {
      storage: {
        sync: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
        local: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
        onChanged: { addListener: () => {} }
      },
      tabs: {
        onCreated: { addListener: () => {} },
        onUpdated: { addListener: () => {} },
        onRemoved: { addListener: () => {} },
        onReplaced: { addListener: () => {} },
        onAttached: { addListener: () => {} },
        onDetached: { addListener: () => {} },
        onActivated: { addListener: () => {} },
        query: () => Promise.resolve([])
      },
      tabGroups: {
        onCreated: { addListener: () => {} },
        onUpdated: { addListener: () => {} },
        onRemoved: { addListener: () => {} }
      },
      runtime: {
        onMessage: { addListener: () => {} },
        onStartup: { addListener: () => {} },
        onInstalled: { addListener: () => {} }
      },
      windows: {
        onBoundsChanged: { addListener: () => {} },
        onRemoved: { addListener: () => {} },
        onCreated: { addListener: () => {} },
        onFocusChanged: { addListener: () => {} },
        WINDOW_ID_NONE: -1
      },
      action: {
        setBadgeText: () => Promise.resolve(),
        setBadgeBackgroundColor: () => Promise.resolve()
      }
    },
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    setTimeout: () => {},
    clearTimeout: () => {},
    Map: Map,
    Set: Set,
    String: String,
    URL: URL
  };

  const wrap = `
    return function(mockGlobal) {
      with (mockGlobal) {
        ${code}
        return {
          matchesPattern,
          patternParseCache,
          MAX_PATTERN_CACHE_SIZE
        };
      }
    }
  `;

  return (new Function(wrap)()(mockGlobal));
}

module.exports = { loadBackgroundScript };
