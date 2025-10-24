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
    for (const tab of matchingTabs) {
      if (!tabsByWindow[tab.windowId]) tabsByWindow[tab.windowId] = [];
      tabsByWindow[tab.windowId].push(tab);
    }

    // For positioning/color defaults
    const settings = await getAutoTabGroupingSettings();

    // Process each window
    for (const [windowIdStr, windowTabs] of Object.entries(tabsByWindow)) {
      const windowId = Number(windowIdStr);
      if (!Array.isArray(windowTabs) || windowTabs.length === 0) continue;

      const existingGroups = await chrome.tabGroups.query({ windowId });
      let targetGroup = existingGroups.find(group => group.title === rule.groupName);
      const tabIds = windowTabs.map(t => t.id);

      if (targetGroup) {
        // Add all matching tabs to the existing group
        await chrome.tabs.group({ tabIds, groupId: targetGroup.id });
        // Optionally update color/title to match rule
        const updateOptions = { title: rule.groupName };
        if (rule.groupColor) {
          updateOptions.color = rule.groupColor === 'default' ? getRandomTabGroupColor() : rule.groupColor;
        }
        try { await chrome.tabGroups.update(targetGroup.id, updateOptions); } catch (e) {}
        console.log(`Added ${tabIds.length} tab(s) to existing group "${targetGroup.title}" in window ${windowId}`);
      } else {
        // Create a new group
        const groupId = await chrome.tabs.group({ tabIds });
        const updateOptions = { title: rule.groupName };
        if (rule.groupColor) {
          updateOptions.color = rule.groupColor === 'default' ? getRandomTabGroupColor() : rule.groupColor;
        } else {
          updateOptions.color = getRandomTabGroupColor();
        }
        await chrome.tabGroups.update(groupId, updateOptions);
        console.log(`Created group "${rule.groupName}" with ${windowTabs.length} tab(s) in window ${windowId}`);
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
      allowedDuplicatePatterns: [],
      duplicateBannerEnabled: true,
      duplicateBannerDelaySeconds: 5
    });
    return result;
  } catch (error) {
    console.error('Error getting duplicate prevention settings:', error);
    return { duplicatePreventionEnabled: true, closeOlderTab: false, allowedDuplicatePatterns: [], duplicateBannerEnabled: true, duplicateBannerDelaySeconds: 5 };
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
          console.log(`Duplicate detected: ${normalizedUrl}`);
          const defaultClosesOlder = !!settings.closeOlderTab;

          // If banner is enabled, show a banner on the new tab and wait for decision; otherwise proceed immediately
          if (settings.duplicateBannerEnabled) {
            const token = `${Date.now()}_${newTabId}_${existingTabId}`;
            pendingDuplicateBanners.set(token, {
              token,
              url: normalizedUrl,
              newTabId,
              existingTabId,
              defaultClosesOlder
            });
            try {
              await chrome.scripting.executeScript({
                target: { tabId: newTabId },
                func: injectedShowDuplicateBanner,
                args: [
                  {
                    token,
                    defaultClosesOlder,
                    delaySeconds: Math.max(1, Math.min(300, Number(settings.duplicateBannerDelaySeconds) || 5))
                  }
                ]
              });
            } catch (e) {
              console.warn('Failed to inject duplicate banner, falling back to immediate action', e);
              await performDuplicateDefaultAction({ newTabId, existingTabId, defaultClosesOlder, normalizedUrl });
            }
            // Either way, stop further processing here; action will be handled by message or we already acted.
            return;
          } else {
            await performDuplicateDefaultAction({ newTabId, existingTabId, defaultClosesOlder, normalizedUrl });
            return;
          }
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

// Track pending banners so we can apply the right action when the user clicks
const pendingDuplicateBanners = new Map(); // token -> { token, url, newTabId, existingTabId, defaultClosesOlder }

// Perform the default duplicate resolution action and fix focus behavior robustly
async function performDuplicateDefaultAction({ newTabId, existingTabId, defaultClosesOlder, normalizedUrl }) {
  try {
    // Update the map with the remaining tab BEFORE closing
    const tabToKeep = defaultClosesOlder ? newTabId : existingTabId;
    tabUrlMap.set(normalizedUrl, tabToKeep);

    if (defaultClosesOlder) {
      // Close older = close existing, keep the new tab
      try { await chrome.tabs.remove(existingTabId); } catch (e) { /* ignore */ }
      // Keep focus on the new tab (already active usually)
    } else {
      // Close newer = focus existing, then close new
      let existingTab = null;
      try { existingTab = await chrome.tabs.get(existingTabId); } catch {}
      if (existingTab && typeof existingTab.windowId !== 'undefined') {
        try { await chrome.windows.update(existingTab.windowId, { focused: true }); } catch (e) {}
      }
      try { await chrome.tabs.update(existingTabId, { active: true }); } catch (e) {}
      try { await chrome.tabs.remove(newTabId); } catch (e) { /* ignore */ }
    }
  } catch (e) {
    console.error('performDuplicateDefaultAction failed', e);
  }
}

// Injected function to show a top-of-page duplicate banner with countdown and action buttons
function injectedShowDuplicateBanner(opts) {
  try {
    const token = opts && opts.token;
    const defaultClosesOlder = !!(opts && opts.defaultClosesOlder);
    let seconds = Math.max(1, Math.min(300, Number((opts && opts.delaySeconds) || 5)));
      let decided = false;

    // Avoid duplicating banners on the same page
    if (window.__ctmDupBannerEl) {
      try { window.__ctmDupBannerEl.remove(); } catch (e) {}
      window.__ctmDupBannerEl = null;
    }

    const style = document.createElement('style');
      style.textContent = `
        .ctm-glass { background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.16));
          backdrop-filter: blur(14px) saturate(180%); -webkit-backdrop-filter: blur(14px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.35); box-shadow: 0 10px 30px rgba(15,23,42,0.14); }
        .ctm-dup-banner{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;color:#0f172a;border-radius:14px;}
        .ctm-dup-inner{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;}
        .ctm-dup-title{font-weight:700}
        .ctm-dup-spacer{flex:1}
        .ctm-dup-btn{border:1px solid rgba(255,255,255,0.35);border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer;background: rgba(255,255,255,0.18);}
        .ctm-dup-btn:hover{background: rgba(255,255,255,0.28)}
        .ctm-dup-primary{color:#fff; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); border: none;}
        .ctm-dup-secondary{color:#0f172a;}
        .ctm-dup-timer{font-variant-numeric:tabular-nums;background: rgba(255,255,255,0.34); border: 1px solid rgba(255,255,255,0.35); border-radius:10px;padding:4px 8px}
      `;
    document.documentElement.appendChild(style);

    const bar = document.createElement('div');
      bar.className = 'ctm-dup-banner ctm-glass';
    bar.innerHTML = `<div class="ctm-dup-inner">
        <span class="ctm-dup-title">Duplicate tab detected</span>
        <span class="ctm-dup-timer" id="ctmDupTimer">${seconds}s</span>
        <span class="ctm-dup-spacer"></span>
        <button class="ctm-dup-btn ctm-dup-primary" id="ctmDupDefaultBtn"></button>
        <button class="ctm-dup-btn ctm-dup-secondary" id="ctmDupKeepBtn">Keep this duplicate</button>
      </div>`;
    document.documentElement.appendChild(bar);
    window.__ctmDupBannerEl = bar;

    // Set default action button label based on policy
    const defaultBtn = bar.querySelector('#ctmDupDefaultBtn');
    if (defaultClosesOlder) {
      defaultBtn.textContent = 'Keep this tab (Close older)';
    } else {
      defaultBtn.textContent = 'Go to existing tab (Close newer)';
    }

    const send = (decision) => {
        if (decided) return; decided = true;
        try { chrome.runtime.sendMessage({ type: 'duplicateBannerAction', token, decision }); } catch (e) {}
    };

    defaultBtn.addEventListener('click', () => {
      cleanup();
      send('default');
    });
    const keepBtn = bar.querySelector('#ctmDupKeepBtn');
    keepBtn.addEventListener('click', () => {
      cleanup();
      send('keep');
    });

    const timerEl = bar.querySelector('#ctmDupTimer');
    const iv = setInterval(() => {
        if (decided) { try { clearInterval(iv); } catch (e) {} return; }
        seconds -= 1;
      if (seconds <= 0) {
        clearInterval(iv);
          if (!decided) { cleanup(); send('default'); }
      } else if (timerEl) {
        timerEl.textContent = `${seconds}s`;
      }
    }, 1000);

    function cleanup(){
      try { clearInterval(iv); } catch (e) {}
      try { if (bar && bar.parentElement) bar.parentElement.removeChild(bar); } catch (e) {}
      try { if (style && style.parentElement) style.parentElement.removeChild(style); } catch (e) {}
      try { delete window.__ctmDupBannerEl; } catch (e) {}
    }
  } catch (e) {
    // ignore injection failures
  }
}

// Receive decisions from the injected duplicate banner
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'duplicateBannerAction') {
    (async () => {
      try {
        const { token, decision } = request;
        if (!token || !pendingDuplicateBanners.has(token)) { sendResponse && sendResponse({ ok: false }); return; }
        const ctx = pendingDuplicateBanners.get(token);
        pendingDuplicateBanners.delete(token);

        if (decision === 'keep') {
          // Do nothing; user chose to keep both
          sendResponse && sendResponse({ ok: true });
          return;
        }

        // Apply default action
        await performDuplicateDefaultAction({
          newTabId: ctx.newTabId,
          existingTabId: ctx.existingTabId,
          defaultClosesOlder: ctx.defaultClosesOlder,
          normalizedUrl: ctx.url
        });
        sendResponse && sendResponse({ ok: true });
      } catch (e) {
        sendResponse && sendResponse({ ok: false, error: e.message });
      }
    })();
    return true; // async
  }
});

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
      urlPatterns: [],
      autoCloseBannerEnabled: true
    });
    console.log('Loaded auto-close settings:', result);
    return result;
  } catch (error) {
    console.error('Error getting auto-close settings:', error);
    return { autoCloseEnabled: false, closeDelay: 5, urlPatterns: [], autoCloseBannerEnabled: true };
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
      // Respect temporary suppression (e.g., user clicked "Do not close")
      if (isAutoCloseSuppressed(tabId)) {
        console.log(`Auto-close suppressed for tab ${tabId}`);
        return;
      }

      console.log(`Scheduling auto-close banner for tab ${tabId} (${url}) with ${settings.closeDelay} second countdown`);

      // Clear any existing timeout for this tab; the banner countdown will own timing
      if (autoCloseTimeouts.has(tabId)) {
        clearTimeout(autoCloseTimeouts.get(tabId));
        autoCloseTimeouts.delete(tabId);
        console.log(`Cleared existing timeout for tab ${tabId}`);
      }

      if (settings.autoCloseBannerEnabled) {
        // Attempt to inject auto-close banner; if injection fails, fallback to timeout close
        const token = `ac_${Date.now()}_${tabId}`;
        pendingAutoCloseBanners.set(token, { token, tabId, initialUrl: url, delay: settings.closeDelay });
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            func: injectedShowAutoCloseBanner,
            args: [{ token, seconds: Math.max(1, Math.min(300, Number(settings.closeDelay) || 5)) }]
          });
          console.log(`Injected auto-close banner for tab ${tabId}`);
        } catch (e) {
          console.warn('Failed to inject auto-close banner, falling back to timeout:', e?.message || e);
          scheduleAutoCloseTimeout(tabId, settings);
        }
      } else {
        // Banner disabled: schedule background timeout close
        scheduleAutoCloseTimeout(tabId, settings);
      }
    } else {
      console.log(`URL "${url}" does not match any auto-close patterns`);
    }
  } catch (error) {
    console.error('Error handling auto-close:', error);
  }
}

function scheduleAutoCloseTimeout(tabId, settings) {
  const delayMs = Math.max(1, Math.min(300, Number(settings.closeDelay) || 5)) * 1000;
  const timeoutId = setTimeout(async () => {
    try {
      // Abort if suppressed in the meantime
      if (isAutoCloseSuppressed(tabId)) {
        autoCloseTimeouts.delete(tabId);
        return;
      }
      console.log(`Auto-close timeout triggered for tab ${tabId}`);
      const tab = await chrome.tabs.get(tabId);
      if (tab && settings.urlPatterns.some(pattern => matchesPattern(tab.url, pattern))) {
        await chrome.tabs.remove(tabId);
        console.log(`Auto-closed tab: ${tab.url}`);
      } else {
        console.log(`Tab ${tabId} no longer matches patterns or doesn't exist`);
      }
    } catch (error) {
      console.log(`Tab ${tabId} already closed or not found:`, error?.message || error);
    } finally {
      autoCloseTimeouts.delete(tabId);
    }
  }, delayMs);
  autoCloseTimeouts.set(tabId, timeoutId);
}

// Track pending auto-close banners by token
const pendingAutoCloseBanners = new Map(); // token -> { token, tabId, initialUrl, delay }

// Suppression map for auto-close after user chooses "Do not close"
const suppressedAutoCloseTabs = new Map(); // tabId -> expiresAt (ms since epoch)

function isAutoCloseSuppressed(tabId) {
  if (!suppressedAutoCloseTabs.has(tabId)) return false;
  const expires = suppressedAutoCloseTabs.get(tabId);
  if (Date.now() > expires) { suppressedAutoCloseTabs.delete(tabId); return false; }
  return true;
}

// Injected function to show an auto-close top banner with countdown and buttons
function injectedShowAutoCloseBanner(opts) {
  try {
    const token = opts && opts.token;
    let seconds = Math.max(1, Math.min(300, Number((opts && opts.seconds) || 5)));
    let decided = false;

    // Prevent duplicates on the page
    if (window.__ctmAcBannerEl) {
      try { window.__ctmAcBannerEl.remove(); } catch (e) {}
      window.__ctmAcBannerEl = null;
    }

    const style = document.createElement('style');
    style.textContent = `
      .ctm-glass { background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.16));
        backdrop-filter: blur(14px) saturate(180%); -webkit-backdrop-filter: blur(14px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.35); box-shadow: 0 10px 30px rgba(15,23,42,0.14); }
      .ctm-ac-banner{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;color:#0f172a;border-radius:14px;}
      .ctm-ac-inner{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;}
      .ctm-ac-title{font-weight:700}
      .ctm-ac-spacer{flex:1}
      .ctm-ac-btn{border:1px solid rgba(255,255,255,0.35);border-radius:10px;padding:8px 10px;font-weight:700;cursor:pointer;background: rgba(255,255,255,0.18);}
      .ctm-ac-btn:hover{background: rgba(255,255,255,0.28)}
      .ctm-ac-primary{color:#fff; background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); border: none;}
      .ctm-ac-secondary{color:#0f172a;}
      .ctm-ac-timer{font-variant-numeric:tabular-nums;background: rgba(255,255,255,0.34); border: 1px solid rgba(255,255,255,0.35); border-radius:10px;padding:4px 8px}
    `;
    document.documentElement.appendChild(style);

    const bar = document.createElement('div');
    bar.className = 'ctm-ac-banner ctm-glass';
    bar.innerHTML = `<div class="ctm-ac-inner">
      <span class="ctm-ac-title">This tab will auto-close</span>
      <span class="ctm-ac-timer" id="ctmAcTimer">${seconds}s</span>
      <span class="ctm-ac-spacer"></span>
      <button class="ctm-ac-btn ctm-ac-primary" id="ctmAcCloseNowBtn">Close now</button>
      <button class="ctm-ac-btn ctm-ac-secondary" id="ctmAcKeepBtn">Do not close</button>
    </div>`;
    document.documentElement.appendChild(bar);
    window.__ctmAcBannerEl = bar;

    const send = (decision) => {
      if (decided) return; decided = true;
      try { chrome.runtime.sendMessage({ type: 'autoCloseBannerAction', token, decision }); } catch (e) {}
    };

    const closeBtn = bar.querySelector('#ctmAcCloseNowBtn');
    const keepBtn = bar.querySelector('#ctmAcKeepBtn');
    const timerEl = bar.querySelector('#ctmAcTimer');
    const iv = setInterval(() => {
      if (decided) { try { clearInterval(iv); } catch (e) {} return; }
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(iv);
        if (!decided) { cleanup(); send('close'); }
      } else if (timerEl) {
        timerEl.textContent = `${seconds}s`;
      }
    }, 1000);

    closeBtn.addEventListener('click', () => { cleanup(); send('close'); });
    keepBtn.addEventListener('click', () => { cleanup(); send('keep'); });

    function cleanup(){
      try { clearInterval(iv); } catch (e) {}
      try { if (bar && bar.parentElement) bar.parentElement.removeChild(bar); } catch (e) {}
      try { if (style && style.parentElement) style.parentElement.removeChild(style); } catch (e) {}
      try { delete window.__ctmAcBannerEl; } catch (e) {}
    }
  } catch (e) {
    // ignore
  }
}

// Handle decisions from auto-close banner
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'autoCloseBannerAction') {
    (async () => {
      try {
        const { token, decision } = request;
        if (!token || !pendingAutoCloseBanners.has(token)) { sendResponse && sendResponse({ ok: false }); return; }
        const ctx = pendingAutoCloseBanners.get(token);
        pendingAutoCloseBanners.delete(token);

        // Clear any fallback timeout if one exists (shouldn't if injection succeeded, but safe)
        if (autoCloseTimeouts.has(ctx.tabId)) {
          try { clearTimeout(autoCloseTimeouts.get(ctx.tabId)); } catch {}
          autoCloseTimeouts.delete(ctx.tabId);
        }

        if (decision === 'keep') {
          // Suppress auto-close for this tab for at least closeDelay seconds (or 10s minimum)
          try {
            const settings = await getAutoCloseSettings();
            const ms = Math.max(10000, (Number(settings.closeDelay) || 5) * 1000);
            suppressedAutoCloseTabs.set(ctx.tabId, Date.now() + ms);
          } catch {}
          sendResponse && sendResponse({ ok: true });
          return;
        }

        // decision === 'close' (via click or timeout)
        try {
          const settings = await getAutoCloseSettings();
          const tab = await chrome.tabs.get(ctx.tabId);
          if (tab && settings.urlPatterns.some(pattern => matchesPattern(tab.url, pattern))) {
            await chrome.tabs.remove(ctx.tabId);
            console.log(`Auto-closed tab via banner: ${tab.url}`);
          }
        } catch (e) { /* ignore */ }
        sendResponse && sendResponse({ ok: true });
      } catch (e) {
        sendResponse && sendResponse({ ok: false, error: e.message });
      }
    })();
    return true; // async
  }
});

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
