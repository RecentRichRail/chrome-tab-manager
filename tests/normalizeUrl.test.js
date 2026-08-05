const assert = require('assert');
const { describe, it } = require('node:test');

// Mock chrome API so background.js can load without errors
global.chrome = {
  runtime: {
    getURL: () => '',
    onMessage: {
      addListener: () => {}
    },
    onInstalled: {
      addListener: () => {}
    },
    onStartup: {
      addListener: () => {}
    }
  },
  tabs: {
    query: () => Promise.resolve([]),
    onCreated: {
      addListener: () => {}
    },
    onUpdated: {
      addListener: () => {}
    },
    onRemoved: {
      addListener: () => {}
    },
    onActivated: {
      addListener: () => {}
    }
  },
  windows: {
    onCreated: {
      addListener: () => {}
    },
    onFocusChanged: {
      addListener: () => {}
    },
    onRemoved: {
      addListener: () => {}
    },
    onBoundsChanged: {
      addListener: () => {}
    }
  },
  storage: {
    sync: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve({})
    },
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve({})
    },
    onChanged: {
      addListener: () => {}
    }
  },
  tabGroups: {
    onCreated: {
      addListener: () => {}
    },
    onUpdated: {
      addListener: () => {}
    },
    onRemoved: {
      addListener: () => {}
    }
  },
  action: {
    setBadgeText: () => {},
    setBadgeBackgroundColor: () => {}
  }
};

const { normalizeUrl } = require('../background.js');

describe('normalizeUrl', () => {
  it('should remove the hash fragment from a valid URL', () => {
    const url = 'https://example.com/path?query=1#hash';
    const normalized = normalizeUrl(url);
    assert.strictEqual(normalized, 'https://example.com/path?query=1');
  });

  it('should return the original URL if parsing fails (error path)', () => {
    // This string causes `new URL()` to throw a TypeError
    const invalidUrl = 'invalid url structure that fails parsing';
    const normalized = normalizeUrl(invalidUrl);
    assert.strictEqual(normalized, invalidUrl);
  });

  it('should return original value for null input (error path)', () => {
    const input = null;
    // URL(null) without base throws TypeError in Node
    const normalized = normalizeUrl(input);
    assert.strictEqual(normalized, input);
  });
});
