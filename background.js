// Background script for Chrome Tab Manager
// This script runs in the background and manages the tab count badge, auto-collapse functionality, auto-close pages, and duplicate tab prevention

// Store the last active tab group ID to track group switching
let lastActiveGroupId = null;
let collapseTimeout = null;
let autoCloseTimeouts = new Map(); // Track auto-close timeouts for tabs
let tabUrlMap = new Map(); // Track all open tabs by URL for duplicate detection
// Window label storage key
const WINDOW_LABEL_KEY = 'windowLabels';
// Track which window IDs we've already prompted to avoid duplicate prompts
const promptedWindows = new Set();
// Explorer pop-out window tracking and size persistence
const EXPLORER_SIZE_KEY = 'explorerWindowSize';
let explorerWindowId = null;
const WINDOW_PREFIX_ENABLED_KEY = 'windowPrefixEnabled';

// Function to get auto tab grouping settings from storage
async function getAutoTabGroupingSettings() {
  try {
    const result = await chrome.storage.sync.get({
      autoTabGroupingEnabled: true,
      applyToGroupedTabs: false,
      ignorePinnedTabs: true,
      addTabPosition: 'right', // 'right' or 'left'
      autoCloseSingleTabGroups: false, // Auto-close groups with only one tab (disabled)
      tabGroupRules: [] // Array of {patterns: string[], groupName: string, groupColor?: string}
    });
    
    // Migrate old format rules to new format
    if (result.tabGroupRules) {
      result.tabGroupRules = result.tabGroupRules.map(rule => {
        if (rule.pattern && !rule.patterns) {
          // Convert old single pattern format to new multiple patterns format
          return {
            patterns: [rule.pattern],
            groupName: rule.groupName,
            ...(rule.groupColor && { groupColor: rule.groupColor })
          };
        }
        return rule;
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error getting auto tab grouping settings:', error);
    return { 
      autoTabGroupingEnabled: true, 
      applyToGroupedTabs: false, 
      ignorePinnedTabs: true, 
      addTabPosition: 'right',
      autoCloseSingleTabGroups: false,
      tabGroupRules: [] 
    };
  }
}

// Function to get a random tab group color
function getRandomTabGroupColor() {
  const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Function to group existing tabs that match a rule
async function groupExistingTabsForRule(rule) {
  try {
    if (!rule.patterns || rule.patterns.length === 0) {
      console.log(`No patterns in rule for ${rule.groupName}`);
      return;
    }

    console.log(`Checking existing tabs for rule: ${rule.groupName}`);
    
    // Get all tabs across all windows
    const tabs = await chrome.tabs.query({});
    const matchingTabs = [];
    
    // Find tabs that match this rule's patterns
    for (const tab of tabs) {
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        const matches = rule.patterns.some(pattern => {
          const result = matchesPattern(tab.url, pattern);
          console.log(`Existing tab pattern check: "${pattern}" vs "${tab.url}" = ${result}`);
          return result;
        });
        
        if (matches) {
          matchingTabs.push(tab);
          console.log(`✓ Found matching existing tab: ${tab.url} for rule ${rule.groupName}`);
        }
      }
    }
    
    if (matchingTabs.length === 0) {
      console.log(`No existing tabs match rule ${rule.groupName}`);
      return;
    }
    
    // Group tabs by window
    const tabsByWindow = {};
    matchingTabs.forEach(tab => {
      if (!tabsByWindow[tab.windowId]) {
        tabsByWindow[tab.windowId] = [];
      }
      tabsByWindow[tab.windowId].push(tab);
    });
    
    // Process each window
    for (const [windowId, windowTabs] of Object.entries(tabsByWindow)) {
      if (windowTabs.length === 0) continue;
      
      console.log(`Processing ${windowTabs.length} tabs in window ${windowId} for rule ${rule.groupName}`);
      
      // Check if a group with this name already exists in this window
      const existingGroups = await chrome.tabGroups.query({ windowId: parseInt(windowId) });
      let targetGroup = existingGroups.find(group => group.title === rule.groupName);
      
      if (targetGroup) {
        console.log(`Found existing group "${rule.groupName}" in window ${windowId}`);
        // Add tabs to existing group
        const tabIds = windowTabs.map(tab => tab.id);
        await chrome.tabs.group({ tabIds, groupId: targetGroup.id });
      } else if (windowTabs.length > 0) {
        console.log(`Creating new group "${rule.groupName}" in window ${windowId}`);
        // Create new group with all matching tabs
        const tabIds = windowTabs.map(tab => tab.id);
        const groupId = await chrome.tabs.group({ tabIds });
        
        // Update group properties
        const updateOptions = {
          title: rule.groupName
        };
        
        // Set color if specified
        if (rule.groupColor) {
          updateOptions.color = rule.groupColor;
        } else {
          updateOptions.color = getRandomTabGroupColor();
        }
        
        await chrome.tabGroups.update(groupId, updateOptions);
        console.log(`Created group "${rule.groupName}" with ${windowTabs.length} tabs`);
      }
    }
  } catch (error) {
    console.error('Error grouping existing tabs for rule:', error);
  }
}

// Function to group all existing tabs based on current rules
async function groupAllExistingTabs() {
  try {
    const settings = await getAutoTabGroupingSettings();
    
    if (!settings.autoTabGroupingEnabled || !settings.tabGroupRules.length) {
      return;
    }
    
    console.log('Grouping all existing tabs based on current rules...');
    
    for (const rule of settings.tabGroupRules) {
      await groupExistingTabsForRule(rule);
    }
  } catch (error) {
    console.error('Error grouping all existing tabs:', error);
  }
}

// Function to handle auto tab grouping
async function handleAutoTabGrouping(tabId, url) {
  try {
    const settings = await getAutoTabGroupingSettings();
    
    if (!settings.autoTabGroupingEnabled || !settings.tabGroupRules.length) {
      return;
    }
    
    console.log(`Auto tab grouping check for tab ${tabId}: ${url}`);
    console.log(`Available tab grouping rules:`, settings.tabGroupRules.map(rule => ({
      groupName: rule.groupName,
      patterns: rule.patterns,
      color: rule.groupColor
    })));
    
    // Get the tab details
    const tab = await chrome.tabs.get(tabId);
    
    // Skip pinned tabs if setting is enabled
    if (settings.ignorePinnedTabs && tab.pinned) {
      console.log(`Skipping pinned tab ${tabId}`);
      return;
    }
    
    // Skip already grouped tabs if setting is disabled
    if (!settings.applyToGroupedTabs && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      console.log(`Skipping already grouped tab ${tabId}`);
      return;
    }
    
    // Find matching rule
    const matchingRule = settings.tabGroupRules.find(rule => {
      if (!rule.patterns || rule.patterns.length === 0) {
        return false;
      }
      
      const matches = rule.patterns.some(pattern => {
        const result = matchesPattern(url, pattern);
        console.log(`Tab grouping pattern check: "${pattern}" vs "${url}" = ${result}`);
        return result;
      });
      
      if (matches) {
        console.log(`✓ Found matching tab grouping rule: "${rule.groupName}" for URL: ${url}`);
      }
      
      return matches;
    });
    
    if (!matchingRule) {
      console.log(`No matching rule found for URL: ${url}`);
      return;
    }
    
    console.log(`Found matching rule for ${url}: ${matchingRule.groupName}`);
    
    // Find existing group with the same name in the same window
    const existingGroups = await chrome.tabGroups.query({ 
      windowId: tab.windowId 
    });
    
    let targetGroup = existingGroups.find(group => 
      group.title === matchingRule.groupName
    );
    
    if (targetGroup) {
      // Add tab to existing group
      const groupTabs = await chrome.tabs.query({ 
        groupId: targetGroup.id 
      });
      
      // Determine position within the group
      let index;
      if (settings.addTabPosition === 'left') {
        // Add to the beginning of the group
        index = Math.min(...groupTabs.map(t => t.index));
      } else {
        // Add to the end of the group
        index = Math.max(...groupTabs.map(t => t.index)) + 1;
      }
      
      // Move tab to the correct position and group
      await chrome.tabs.move(tabId, { index });
      await chrome.tabs.group({ tabIds: tabId, groupId: targetGroup.id });
      
      console.log(`Added tab ${tabId} to existing group "${targetGroup.title}" at ${settings.addTabPosition}`);
    } else {
      // Create new group
      console.log(`Creating new group for tab ${tabId} with rule: ${matchingRule.groupName}`);
      const groupId = await chrome.tabs.group({ tabIds: tabId });
      console.log(`Created group ${groupId} with tab ${tabId}`);
      
      // Update group properties
      const updateOptions = {
        title: matchingRule.groupName
      };
      
      // Set color if specified
      if (matchingRule.groupColor) {
        updateOptions.color = matchingRule.groupColor === 'default' ? getRandomTabGroupColor() : matchingRule.groupColor;
      } else {
        // Use random color if no color specified (default)
        updateOptions.color = getRandomTabGroupColor();
      }
      
      await chrome.tabGroups.update(groupId, updateOptions);
      console.log(`Updated group ${groupId} with title "${matchingRule.groupName}" and color "${updateOptions.color}"`);
      
      console.log(`Created new group "${matchingRule.groupName}" for tab ${tabId}`);
    }
    
  } catch (error) {
    console.error('Error handling auto tab grouping:', error);
  }
}

// Function to normalize URL for comparison (remove fragments, query params if needed)
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove fragment (hash) for comparison
    urlObj.hash = '';
    return urlObj.toString();
  } catch (error) {
    return url; // Return original if URL parsing fails
  }
}

// Function to get duplicate prevention settings from storage
async function getDuplicatePreventionSettings() {
  try {
    const result = await chrome.storage.sync.get({
      duplicatePreventionEnabled: true,
      closeOlderTab: false, // false = close newer tab, true = close older tab
      allowedDuplicatePatterns: []
    });
    return result;
  } catch (error) {
    console.error('Error getting duplicate prevention settings:', error);
    return { duplicatePreventionEnabled: true, closeOlderTab: false, allowedDuplicatePatterns: [] };
  }
}

// Function to get auto-collapse settings from storage
async function getAutoCollapseSettings() {
  try {
    const result = await chrome.storage.sync.get({
      autoCollapseEnabled: true,
      collapseDelay: 3 // seconds
    });
    return result;
  } catch (error) {
    console.error('Error getting auto-collapse settings:', error);
    return { autoCollapseEnabled: true, collapseDelay: 3 };
  }
}

// Function to check if URL is allowed to have duplicates
function isAllowedDuplicate(url, patterns) {
  // Check patterns against both original URL and normalized URL (without hash)
  const normalizedUrl = normalizeUrl(url);
  return patterns.some(pattern => {
    const matchesOriginal = matchesPattern(url, pattern);
    const matchesNormalized = matchesPattern(normalizedUrl, pattern);
    console.log(`Duplicate check: Pattern "${pattern}" vs Original "${url}": ${matchesOriginal}, vs Normalized "${normalizedUrl}": ${matchesNormalized}`);
    return matchesOriginal || matchesNormalized;
  });
}

// Function to handle duplicate tab detection and prevention
async function handleDuplicateTab(newTabId, newTabUrl) {
  try {
    const settings = await getDuplicatePreventionSettings();
    
    if (!settings.duplicatePreventionEnabled) {
      return;
    }
    
    const normalizedUrl = normalizeUrl(newTabUrl);
    
    // Check if this URL is allowed to have duplicates using the original URL
    if (isAllowedDuplicate(newTabUrl, settings.allowedDuplicatePatterns)) {
      console.log(`URL allowed to have duplicates: ${newTabUrl} (normalized: ${normalizedUrl})`);
      tabUrlMap.set(normalizedUrl, newTabId); // Still track it
      return;
    }
    
    // Check if this URL already exists in another tab
    const existingTabId = tabUrlMap.get(normalizedUrl);
    if (existingTabId && existingTabId !== newTabId) {
      // Verify the existing tab still exists
      try {
        const existingTab = await chrome.tabs.get(existingTabId);
        if (existingTab && normalizeUrl(existingTab.url) === normalizedUrl) {
          // Decide which tab to close based on settings
          const tabToClose = settings.closeOlderTab ? existingTabId : newTabId;
          const tabToKeep = settings.closeOlderTab ? newTabId : existingTabId;
          
          console.log(`Duplicate detected: ${normalizedUrl}`);
          console.log(`Closing ${settings.closeOlderTab ? 'older' : 'newer'} tab (ID: ${tabToClose}) immediately`);
          
          // Update the map with the remaining tab BEFORE closing
          tabUrlMap.set(normalizedUrl, tabToKeep);
          
          // Close the designated tab immediately
          await chrome.tabs.remove(tabToClose);
          
          // Focus the remaining tab if we closed the newer one
          if (!settings.closeOlderTab) {
            await chrome.tabs.update(existingTabId, { active: true });
          }
          
          return;
        }
      } catch (error) {
        // Existing tab no longer exists, remove from map
        tabUrlMap.delete(normalizedUrl);
      }
    }
    
    // Add/update the tab in our tracking map
    tabUrlMap.set(normalizedUrl, newTabId);
    
  } catch (error) {
    console.error('Error handling duplicate tab:', error);
  }
}

// Function to update tab URL mapping when tabs change
async function updateTabUrlMap() {
  try {
    const tabs = await chrome.tabs.query({});
    const newMap = new Map();
    
    tabs.forEach(tab => {
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        const normalizedUrl = normalizeUrl(tab.url);
        // Keep the most recent tab ID for each URL (in case of race conditions)
        newMap.set(normalizedUrl, tab.id);
      }
    });
    
    tabUrlMap = newMap;
    console.log(`Updated tab URL map with ${tabUrlMap.size} entries`);
  } catch (error) {
    console.error('Error updating tab URL map:', error);
  }
}

// Function to check if a URL matches a pattern with wildcards
function matchesPattern(url, pattern) {
  try {
    // Handle empty pattern or URL
    if (!pattern || !url) {
      return false;
    }
    
    // Convert pattern to regex step by step
    let regexPattern = '';
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i];
      if (char === '*') {
        regexPattern += '.*'; // Wildcard becomes .*
      } else if (/[.+^${}()|[\]\\]/.test(char)) {
        regexPattern += '\\' + char; // Escape special regex chars
      } else {
        regexPattern += char; // Regular character
      }
    }
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    const result = regex.test(url);
    
    // Only log for debugging when needed
    if (result || pattern.includes('spicerhome.net')) {
      console.log(`Pattern match: "${pattern}" -> regex: "^${regexPattern}$" vs "${url}" = ${result}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error in pattern matching for pattern "${pattern}" and URL "${url}":`, error);
    return false;
  }
}

// Function to get auto-close settings from storage
async function getAutoCloseSettings() {
  try {
    const result = await chrome.storage.sync.get({
      autoCloseEnabled: false,
      closeDelay: 5,
      urlPatterns: []
    });
    console.log('Loaded auto-close settings:', result);
    return result;
  } catch (error) {
    console.error('Error getting auto-close settings:', error);
    return { autoCloseEnabled: false, closeDelay: 5, urlPatterns: [] };
  }
}

// Function to handle auto-close for a tab
async function handleAutoClose(tabId, url) {
  try {
    const settings = await getAutoCloseSettings();
    
    console.log(`Auto-close check for tab ${tabId}: enabled=${settings.autoCloseEnabled}, patterns=${settings.urlPatterns.length}, url=${url}`);
    
    if (!settings.autoCloseEnabled || !settings.urlPatterns.length) {
      console.log(`Auto-close skipped: enabled=${settings.autoCloseEnabled}, patterns=${settings.urlPatterns.length}`);
      return;
    }
    
    // Check if URL matches any pattern
    const shouldClose = settings.urlPatterns.some(pattern => {
      const matches = matchesPattern(url, pattern);
      if (matches) {
        console.log(`✓ Auto-close pattern "${pattern}" matches "${url}"`);
      }
      return matches;
    });
    
    if (shouldClose) {
      console.log(`Scheduling auto-close for tab ${tabId} (${url}) in ${settings.closeDelay} seconds`);
      
      // Clear any existing timeout for this tab
      if (autoCloseTimeouts.has(tabId)) {
        clearTimeout(autoCloseTimeouts.get(tabId));
        console.log(`Cleared existing timeout for tab ${tabId}`);
      }
      
      // Set new timeout
      const timeoutId = setTimeout(async () => {
        try {
          console.log(`Auto-close timeout triggered for tab ${tabId}`);
          // Check if tab still exists and hasn't been navigated away
          const tab = await chrome.tabs.get(tabId);
          if (tab && settings.urlPatterns.some(pattern => matchesPattern(tab.url, pattern))) {
            await chrome.tabs.remove(tabId);
            console.log(`Auto-closed tab: ${tab.url}`);
          } else {
            console.log(`Tab ${tabId} no longer matches patterns or doesn't exist`);
          }
        } catch (error) {
          // Tab might already be closed, ignore error
          console.log(`Tab ${tabId} already closed or not found:`, error.message);
        } finally {
          autoCloseTimeouts.delete(tabId);
        }
      }, settings.closeDelay * 1000);
      
      autoCloseTimeouts.set(tabId, timeoutId);
    } else {
      console.log(`URL "${url}" does not match any auto-close patterns`);
    }
  } catch (error) {
    console.error('Error handling auto-close:', error);
  }
}

// Function to update the badge with the global tab count, and show '!' only for the active tab of an unnamed current window
async function updateTabCountBadge() {
  try {
    // Global default badge: total tabs
    const tabs = await chrome.tabs.query({});
    const tabCount = tabs.length;
    await chrome.action.setBadgeText({ text: tabCount.toString() });
    await chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });

    // Active tab: show '!' if unnamed; otherwise explicitly set count so it persists
    const labels = await getWindowLabels();
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!activeTab) return;
    const hasLabel = !!labels[String(activeTab.windowId)];
    if (!hasLabel) {
      await chrome.action.setBadgeText({ tabId: activeTab.id, text: '!' });
      await chrome.action.setBadgeBackgroundColor({ tabId: activeTab.id, color: '#ef4444' });
    } else {
      await chrome.action.setBadgeText({ tabId: activeTab.id, text: tabCount.toString() });
      await chrome.action.setBadgeBackgroundColor({ tabId: activeTab.id, color: '#4285f4' });
    }
  } catch (error) {
    console.error('Error updating tab count badge:', error);
  }
}

// --- Window labeling helpers ---
async function getWindowLabels() {
  try {
    const data = await chrome.storage.local.get(WINDOW_LABEL_KEY);
    const raw = data[WINDOW_LABEL_KEY] || {};
    // Normalize keys to strings to avoid number/string mismatch between APIs
    const normalized = {};
    for (const k of Object.keys(raw)) {
      normalized[String(k)] = raw[k];
    }
    return normalized;
  } catch (e) {
    console.error('Error reading window labels', e);
    return {};
  }
}

async function saveWindowLabels(labels) {
  try {
    await chrome.storage.local.set({ [WINDOW_LABEL_KEY]: labels });
  } catch (e) {
    console.error('Error saving window labels', e);
  }
}

// Per-window prefix enabled state helpers
async function getWindowPrefixEnabledMap() {
  try {
    const data = await chrome.storage.local.get(WINDOW_PREFIX_ENABLED_KEY);
    return data[WINDOW_PREFIX_ENABLED_KEY] || {};
  } catch (e) {
    console.error('Error reading window prefix enabled map', e);
    return {};
  }
}

async function isWindowPrefixEnabled(windowId) {
  const map = await getWindowPrefixEnabledMap();
  const key = String(windowId);
  return Object.prototype.hasOwnProperty.call(map, key) ? !!map[key] : true; // default to true
}

async function setWindowPrefixEnabled(windowId, enabled) {
  try {
    const map = await getWindowPrefixEnabledMap();
    map[String(windowId)] = !!enabled;
    await chrome.storage.local.set({ [WINDOW_PREFIX_ENABLED_KEY]: map });
  } catch (e) {
    console.error('Error saving window prefix enabled state', e);
  }
}

// Inject function into page to prefix document.title and observe changes
function injectedSetLabel(label, forceEnable) {
  try {
    if (!label) return;
    // If caller is re-enabling, flip the disabled flag back on first
    if (forceEnable === true) {
      try { window.__chromeWindowLabelEnabled = true; } catch (e) {}
    }
    // Respect an explicit disabled flag set by the extension when not forced
    if (typeof window.__chromeWindowLabelEnabled !== 'undefined' && window.__chromeWindowLabelEnabled === false) {
      return;
    }

    // Always (re)apply the prefix for this page. We keep a marker on window
    // but don't early-return because the page's title may have changed without
    // our marker being updated.
  window.__chromeWindowLabel = label;
  window.__chromeWindowLabelEnabled = true;

    // Throttled apply to avoid tight loops on dynamic pages
    const apply = () => {
      const now = Date.now();
      try {
        if (typeof window.__cwlt === 'number' && (now - window.__cwlt) < 600) {
          if (window.__cwld) { try { clearTimeout(window.__cwld); } catch (e) {} }
          window.__cwld = setTimeout(() => { try { apply(); } catch (e) {} }, 600);
          return;
        }
        window.__cwlt = now;
        const current = document.title || '';
        // remove any existing bracketed prefix
        const base = current.replace(/^\[[^\]]*\]\s*/, '');
        const next = `[${label}] ${base}`;
        if (current !== next) {
          document.title = next;
        }
      } catch (e) {
        // ignore
      }
    };

    // Apply immediately
    apply();

    // Observe <title> text changes and reapply our prefix; keep scope minimal
    try {
      // Clean up any prior observer
      if (window.__chromeWindowLabelObserver) {
        try { window.__chromeWindowLabelObserver.disconnect(); } catch (e) {}
      }
      const setupTitleObserver = () => {
        try {
          const titleEl = document.querySelector('title');
          if (!titleEl) return false;
          window.__chromeWindowLabelObserver = new MutationObserver((mutations) => {
            // Only react to TITLE mutations to avoid noise
            for (const m of mutations) {
              const nodeName = (m.target && m.target.nodeName) || '';
              if (nodeName.toUpperCase() === 'TITLE' || (m.target && m.target.parentElement && m.target.parentElement.nodeName.toUpperCase() === 'TITLE')) {
                apply();
                break;
              }
            }
          });
          window.__chromeWindowLabelObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
          return true;
        } catch (e) { return false; }
      };
      // If no <title>, update document.title (which creates/updates it) then try again
      if (!setupTitleObserver()) {
        try { if (!document.querySelector('title')) { document.title = document.title || ' '; } } catch (e) {}
        // As a last resort, watch head for a title being added, then swap observer
        const head = document.head;
        if (head) {
          const tmp = new MutationObserver(() => {
            if (setupTitleObserver()) {
              try { tmp.disconnect(); } catch (e) {}
            }
          });
          tmp.observe(head, { childList: true });
        }
      }
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // ignore
  }
}

// Inject function to clear any prefix added by this extension
function injectedClearLabel() {
  try {
    const current = document.title || '';
    const base = current.replace(/^\[[^\]]*\]\s*/, '');
    if (current !== base) {
      document.title = base;
    }
    // Mark disabled explicitly so any in-flight or stray apply calls bail out
    try { window.__chromeWindowLabelEnabled = false; } catch (e) {}
    try {
      if (window.__chromeWindowLabelObserver) {
        window.__chromeWindowLabelObserver.disconnect();
        delete window.__chromeWindowLabelObserver;
      }
    } catch (e) {}
    try { if (window.__cwld) { clearTimeout(window.__cwld); delete window.__cwld; } } catch (e) {}
    try { delete window.__cwlt; } catch (e) {}
    try { delete window.__chromeWindowLabel; } catch (e) {}
  } catch (e) {
    // ignore
  }
}

async function applyClearToWindow(windowId) {
  try {
    const tabs = await chrome.tabs.query({ windowId: Number(windowId) });
    for (const t of tabs) {
      if (!t.id || !t.url) continue;
      if (t.url.startsWith('chrome://') || t.url.startsWith('chrome-extension://') || t.url === 'chrome://newtab/') continue;
      try {
        await chrome.scripting.executeScript({ target: { tabId: t.id }, func: injectedClearLabel });
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.error('Error clearing label from window', e);
  }
}

// Apply label to all tabs in a window (skip chrome:// and extension pages)
async function applyLabelToWindow(windowId, label) {
  try {
    const enabled = await isWindowPrefixEnabled(windowId);
    if (!enabled) return;
    const tabs = await chrome.tabs.query({ windowId: Number(windowId) });
    for (const t of tabs) {
      if (!t.id || !t.url) continue;
      if (t.url.startsWith('chrome://') || t.url.startsWith('chrome-extension://') || t.url === 'chrome://newtab/') continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: t.id },
          func: injectedSetLabel,
          args: [label, true]
        });
      } catch (e) {
        // some pages disallow injection
      }
    }
  } catch (e) {
    console.error('Error applying label to window', e);
  }
}

// Re-apply label when a tab finishes loading or is created
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status !== 'complete') return;
    const [labels, enabled] = await Promise.all([
      getWindowLabels(),
      isWindowPrefixEnabled(tab.windowId)
    ]);
    if (!enabled) return;
    const label = labels[String(tab.windowId)];
    if (!label) return;
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url === 'chrome://newtab/') return;
    try {
      await chrome.scripting.executeScript({ target: { tabId }, func: injectedSetLabel, args: [label, true] });
    } catch (e) {
      // ignore
    }
  } catch (e) {
    console.error('tabs.onUpdated label reapply error', e);
  }
});

// When a window is removed, clear its label
chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    const labels = await getWindowLabels();
    const key = String(windowId);
    if (labels[key]) {
      delete labels[key];
      await saveWindowLabels(labels);
    }
    // Clear per-window prefix state for removed window
    try {
      const map = await getWindowPrefixEnabledMap();
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        delete map[key];
        await chrome.storage.local.set({ [WINDOW_PREFIX_ENABLED_KEY]: map });
      }
    } catch {}
    // If the explorer pop-out window was closed, clear the tracker
    if (explorerWindowId === windowId) {
      explorerWindowId = null;
    }
  } catch (e) {
    console.error('Error clearing label on window remove', e);
  }
});

// Message handling for popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'setWindowLabel') {
    (async () => {
      try {
        const labels = await getWindowLabels();
        if (!request.label) {
          // remove label
          delete labels[String(request.windowId)];
          // clear any prefixes currently applied in the window
          await applyClearToWindow(request.windowId);
        } else {
          labels[String(request.windowId)] = request.label;
        }
        await saveWindowLabels(labels);
        // apply immediately
        if (request.label) await applyLabelToWindow(request.windowId, request.label);
        // Immediately refresh badge so active-tab badge reflects new state (e.g., remove '!')
        try { await updateTabCountBadge(); } catch (e) { /* non-fatal */ }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true; // async
  } else if (request && request.type === 'getWindowLabel') {
    (async () => {
      const labels = await getWindowLabels();
      sendResponse({ label: labels[request.windowId] || '' });
    })();
    return true;
  }
});

// Function to collapse inactive tab groups
async function collapseInactiveGroups() {
  try {
    // Get the currently active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;

    const currentGroupId = activeTab.groupId;
    
    // Get all tab groups in the current window
    const tabGroups = await chrome.tabGroups.query({ windowId: activeTab.windowId });
    
    for (const group of tabGroups) {
      // Skip the currently active group and already collapsed groups
      if (group.id === currentGroupId || group.collapsed) {
        continue;
      }
      
      // Check if this group has any tabs that were recently active
      const groupTabs = await chrome.tabs.query({ groupId: group.id });
      const hasRecentActivity = groupTabs.some(tab => 
        Date.now() - tab.lastAccessed < 5000 // 5 seconds threshold
      );
      
      // Collapse the group if no recent activity
      if (!hasRecentActivity) {
        await chrome.tabGroups.update(group.id, { collapsed: true });
        console.log(`Collapsed inactive group: ${group.title || 'Untitled'}`);
      }
    }
  } catch (error) {
    console.error('Error collapsing inactive groups:', error);
  }
}

// Function to handle tab activation and group management
async function handleTabActivation(activeInfo) {
  try {
    // Check if auto-collapse is enabled
    const settings = await getAutoCollapseSettings();
    if (!settings.autoCollapseEnabled) {
      console.log('Auto-collapse is disabled');
      return;
    }
    
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const currentGroupId = tab.groupId;
    
    // If switching to a different group, expand it and schedule collapse of others
    if (currentGroupId !== lastActiveGroupId) {
      // Expand the current group if it's collapsed
      if (currentGroupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        const currentGroup = await chrome.tabGroups.get(currentGroupId);
        if (currentGroup.collapsed) {
          await chrome.tabGroups.update(currentGroupId, { collapsed: false });
          console.log(`Expanded group: ${currentGroup.title || 'Untitled'}`);
        }
      }
      
      // Clear any existing timeout
      if (collapseTimeout) {
        clearTimeout(collapseTimeout);
      }
      
      // Schedule collapse of inactive groups after a delay
      collapseTimeout = setTimeout(() => {
        collapseInactiveGroups();
      }, settings.collapseDelay * 1000); // Use configurable delay
      
      lastActiveGroupId = currentGroupId;
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
}

// Update badge when extension starts
chrome.runtime.onStartup.addListener(() => {
  updateTabCountBadge();
  updateTabUrlMap();
});

// Update badge when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  updateTabCountBadge();
  updateTabUrlMap();
});

// Update badge when tabs are created
chrome.tabs.onCreated.addListener((tab) => {
  updateTabCountBadge();
  
  // Handle duplicate detection immediately if URL is available
  if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && tab.url !== 'chrome://newtab/') {
    handleDuplicateTab(tab.id, tab.url);
    
    // Also check for auto-close when tab is created with URL
    handleAutoClose(tab.id, tab.url);
    console.log(`Tab created with URL: ${tab.url}, checking auto-close`);
    
    // Handle auto tab grouping
    handleAutoTabGrouping(tab.id, tab.url);
  }
});

// Update badge when tabs are removed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  updateTabCountBadge();
  // Clear any pending auto-close timeout
  if (autoCloseTimeouts.has(tabId)) {
    clearTimeout(autoCloseTimeouts.get(tabId));
    autoCloseTimeouts.delete(tabId);
  }
  
  // Remove from URL map
  for (const [url, id] of tabUrlMap.entries()) {
    if (id === tabId) {
      tabUrlMap.delete(url);
      break;
    }
  }
});

// Update badge when tabs are updated (e.g., URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  updateTabCountBadge();
  
  // Handle duplicate detection as soon as URL is available (don't wait for complete)
  if (changeInfo.url && !changeInfo.url.startsWith('chrome://') && !changeInfo.url.startsWith('chrome-extension://')) {
    handleDuplicateTab(tabId, changeInfo.url);
  }
  
  // Handle auto-close when URL changes (both on URL change and completion)
  if (changeInfo.url && !changeInfo.url.startsWith('chrome://') && !changeInfo.url.startsWith('chrome-extension://')) {
    handleAutoClose(tabId, changeInfo.url);
    console.log(`Tab ${tabId} URL changed to: ${changeInfo.url}, checking auto-close`);
    
    // Handle auto tab grouping on URL change
    handleAutoTabGrouping(tabId, changeInfo.url);
  }
  
  // Also check on status complete for auto-close (in case URL was set earlier)
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    handleAutoClose(tabId, tab.url);
    console.log(`Tab ${tabId} loading complete: ${tab.url}, checking auto-close`);
    
    // Handle auto tab grouping on completion
    handleAutoTabGrouping(tabId, tab.url);
  }
  
  // Additional check: if URL changed or page completed, check if it should be grouped
  if ((changeInfo.url || changeInfo.status === 'complete') && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    // Add a small delay to ensure the tab update is processed
    setTimeout(() => {
      handleAutoTabGrouping(tabId, tab.url);
    }, 500);
  }
});

// Handle tab activation for auto-collapse functionality
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTabCountBadge();
  handleTabActivation(activeInfo);
  // Re-apply window label to the newly activated tab to ensure the active
  // tab's title shows the prefix even if earlier injection failed.
  (async () => {
    try {
      const labels = await getWindowLabels();
      const wid = String(activeInfo.windowId);
      const label = labels[wid];
      if (!label) return;
      const enabled = await isWindowPrefixEnabled(wid);
      if (!enabled) return;
      try {
        await chrome.scripting.executeScript({ target: { tabId: activeInfo.tabId }, func: injectedSetLabel, args: [label, true] });
      } catch (e) {
        // ignore injection errors
      }
    } catch (e) {
      console.error('Error reapplying window label on activation', e);
    }
  })();
});

// Update badge when windows are created or removed
chrome.windows.onCreated.addListener(() => {
  updateTabCountBadge();
});

chrome.windows.onRemoved.addListener(() => {
  updateTabCountBadge();
});

// Auto-prompt removed: badge indicates attention and user can click action to open prompt.


// Handle tab group updates
chrome.tabGroups.onCreated.addListener(() => {
  updateTabCountBadge();
});

chrome.tabGroups.onRemoved.addListener(() => {
  updateTabCountBadge();
});

chrome.tabGroups.onUpdated.addListener((group) => {
  updateTabCountBadge();
});

// Initial badge update when the service worker starts
updateTabCountBadge();
updateTabUrlMap();

// Message listener for popup communications
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'groupExistingTabs') {
    groupAllExistingTabs().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Error in groupExistingTabs:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  } else if (request.action === 'groupExistingTabsForRule') {
    groupExistingTabsForRule(request.rule).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Error in groupExistingTabsForRule:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
  // support a helper message to return all window labels to the popup explorer
  if (request && request.type === 'getAllWindowLabels') {
    (async () => {
      const labels = await getWindowLabels();
      sendResponse({ labels });
    })();
    return true;
  }
  if (request && request.type === 'activateTab') {
    (async () => {
      try {
        const tabId = Number(request.tabId);
        const windowId = Number(request.windowId);
        const groupId = Number(request.groupId);
        if (Number.isFinite(groupId) && groupId !== -1) {
          try { await chrome.tabGroups.update(groupId, { collapsed: false }); } catch (e) {}
        }
        if (Number.isFinite(windowId)) {
          try { await chrome.windows.update(windowId, { focused: true }); } catch (e) {}
        }
        if (Number.isFinite(tabId)) {
          try { await chrome.tabs.update(tabId, { active: true }); } catch (e) {}
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true; // async
  }
  if (request && request.type === 'closeTab') {
    (async () => {
      try {
        const tabId = Number(request.tabId);
        if (Number.isFinite(tabId)) {
          await chrome.tabs.remove(tabId);
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: 'Invalid tabId' });
        }
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (request && request.type === 'applyWindowLabelPrefix') {
    (async () => {
      try {
        const enabled = !!request.enabled;
        const wid = request.windowId ? String(request.windowId) : null;
        if (wid) {
          await setWindowPrefixEnabled(wid, enabled);
          if (enabled) {
            const labels = await getWindowLabels();
            const label = labels[wid];
            if (label) await applyLabelToWindow(wid, label);
          } else {
            await applyClearToWindow(wid);
          }
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (request && request.type === 'getWindowLabelPrefixEnabled') {
    (async () => {
      try {
        const enabled = await isWindowPrefixEnabled(request.windowId);
        sendResponse({ ok: true, enabled: !!enabled });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
});

// Open/size management for Explorer pop-out window
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'openExplorerWindow') {
    (async () => {
      try {
        if (explorerWindowId) {
          try { await chrome.windows.update(explorerWindowId, { focused: true }); sendResponse({ ok: true, windowId: explorerWindowId }); return; } catch (e) { explorerWindowId = null; }
        }
        const stored = await chrome.storage.sync.get(EXPLORER_SIZE_KEY);
        const def = { width: 900, height: 720 };
        const dims = stored && stored[EXPLORER_SIZE_KEY] ? stored[EXPLORER_SIZE_KEY] : def;
        const url = chrome.runtime.getURL('popup.html?standalone=1');
        const win = await chrome.windows.create({ url, type: 'popup', focused: true, width: Math.max(600, dims.width || def.width), height: Math.max(480, dims.height || def.height) });
        explorerWindowId = win.id;
        sendResponse({ ok: true, windowId: win.id });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
  if (request && request.type === 'saveExplorerWindowSize') {
    (async () => {
      try {
        await chrome.storage.sync.set({ [EXPLORER_SIZE_KEY]: { width: request.width, height: request.height } });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
});

chrome.windows.onBoundsChanged.addListener((win) => {
  if (explorerWindowId && win && win.id === explorerWindowId) {
    const { width, height } = win;
    chrome.storage.sync.set({ [EXPLORER_SIZE_KEY]: { width, height } }).catch(() => {});
  }
});
