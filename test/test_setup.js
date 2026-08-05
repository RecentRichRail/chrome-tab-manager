global.chrome = {
  storage: {
    onChanged: { addListener: () => {} },
    sync: { get: () => ({}) },
    local: { get: () => ({}) }
  },
  runtime: {
    onMessage: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    getURL: () => ''
  },
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
  action: {
    setBadgeText: () => {},
    setBadgeBackgroundColor: () => {}
  }
};
