// Popup script for Chrome Tab Manager
// This script handles the popup interface interactions

// Auto-close settings management
let autoCloseSettings = {
  autoCloseEnabled: false,
  closeDelay: 5,
  urlPatterns: [],
  autoCloseBannerEnabled: true
};

// Duplicate prevention settings management
let duplicatePreventionSettings = {
  duplicatePreventionEnabled: true,
  closeOlderTab: false,
  allowedDuplicatePatterns: [],
  duplicateBannerEnabled: true,
  duplicateBannerDelaySeconds: 5
};

// Auto-collapse settings management
let autoCollapseSettings = {
  autoCollapseEnabled: true,
  collapseDelay: 3
};

// Auto tab grouping settings management
let autoTabGroupingSettings = {
  autoTabGroupingEnabled: true,
  applyToGroupedTabs: false,
  ignorePinnedTabs: true,
  addTabPosition: 'right',
  autoCloseSingleTabGroups: true,
  tabGroupRules: [] // Array of {patterns: string[], groupName: string, groupColor?: string}
};

// General extension settings (reserved for future)
let generalSettings = {};

// Helper: get the current browser windowId (not the popup window)
async function getCurrentBrowserWindowId() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs.length && typeof tabs[0].windowId !== 'undefined') {
      return String(tabs[0].windowId);
    }
  } catch (e) {
    // ignore
  }
  try {
    const win = await chrome.windows.getLastFocused();
    if (win && typeof win.id !== 'undefined') return String(win.id);
  } catch (e) {
    // ignore
  }
  return null;
}

// Load settings from storage
async function loadAutoCloseSettings() {
  try {
    const result = await chrome.storage.sync.get({
      autoCloseEnabled: false,
      closeDelay: 5,
      urlPatterns: [],
      autoCloseBannerEnabled: true
    });
    autoCloseSettings = result;
    updateAutoCloseUI();
  } catch (error) {
    console.error('Error loading auto-close settings:', error);
  }
}

// Load duplicate prevention settings from storage
async function loadDuplicatePreventionSettings() {
  try {
    const result = await chrome.storage.sync.get({
      duplicatePreventionEnabled: true,
      closeOlderTab: false,
      allowedDuplicatePatterns: [],
      duplicateBannerEnabled: true,
      duplicateBannerDelaySeconds: 5
    });
    duplicatePreventionSettings = result;
    updateDuplicatePreventionUI();
  } catch (error) {
    console.error('Error loading duplicate prevention settings:', error);
  }
}

// Load auto-collapse settings from storage
async function loadAutoCollapseSettings() {
  try {
    const result = await chrome.storage.sync.get({
      autoCollapseEnabled: true,
      collapseDelay: 3
    });
    autoCollapseSettings = result;
    updateAutoCollapseUI();
  } catch (error) {
    console.error('Error loading auto-collapse settings:', error);
  }
}

// Load auto tab grouping settings from storage
async function loadAutoTabGroupingSettings() {
  try {
    const result = await chrome.storage.sync.get({
      autoTabGroupingEnabled: true,
      applyToGroupedTabs: false,
      ignorePinnedTabs: true,
      addTabPosition: 'right',
      autoCloseSingleTabGroups: true,
      tabGroupRules: []
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
    
    autoTabGroupingSettings = result;
    updateAutoTabGroupingUI();
  } catch (error) {
    console.error('Error loading auto tab grouping settings:', error);
  }
}

// Save settings to storage
async function saveAutoCloseSettings() {
  try {
    await chrome.storage.sync.set(autoCloseSettings);
    console.log('Auto-close settings saved:', autoCloseSettings);
  } catch (error) {
    console.error('Error saving auto-close settings:', error);
  }
}

// Save duplicate prevention settings to storage
async function saveDuplicatePreventionSettings() {
  try {
    await chrome.storage.sync.set(duplicatePreventionSettings);
    console.log('Duplicate prevention settings saved:', duplicatePreventionSettings);
  } catch (error) {
    console.error('Error saving duplicate prevention settings:', error);
  }
}

// Save auto-collapse settings to storage
async function saveAutoCollapseSettings() {
  try {
    await chrome.storage.sync.set(autoCollapseSettings);
    console.log('Auto-collapse settings saved:', autoCollapseSettings);
  } catch (error) {
    console.error('Error saving auto-collapse settings:', error);
  }
}

// Save auto tab grouping settings to storage
async function saveAutoTabGroupingSettings() {
  try {
    await chrome.storage.sync.set(autoTabGroupingSettings);
    console.log('Auto tab grouping settings saved:', autoTabGroupingSettings);
  } catch (error) {
    console.error('Error saving auto tab grouping settings:', error);
  }
}

// Update the UI with current settings
function updateAutoCloseUI() {
  document.getElementById('autoCloseToggle').checked = autoCloseSettings.autoCloseEnabled;
  document.getElementById('closeDelayInput').value = autoCloseSettings.closeDelay;
  const acBanner = document.getElementById('autoCloseBannerToggle');
  if (acBanner) acBanner.checked = !!autoCloseSettings.autoCloseBannerEnabled;
  updateUrlList();
}

// Update the duplicate prevention UI with current settings
function updateDuplicatePreventionUI() {
  document.getElementById('duplicatePreventionToggle').checked = duplicatePreventionSettings.duplicatePreventionEnabled;
  document.getElementById('duplicateActionSelect').value = duplicatePreventionSettings.closeOlderTab.toString();
  const bannerToggle = document.getElementById('duplicateBannerToggle');
  if (bannerToggle) bannerToggle.checked = !!duplicatePreventionSettings.duplicateBannerEnabled;
  const bannerDelay = document.getElementById('duplicateBannerDelayInput');
  if (bannerDelay) bannerDelay.value = duplicatePreventionSettings.duplicateBannerDelaySeconds || 5;
  updateDuplicateAllowList();
}

// Update the auto-collapse UI with current settings
function updateAutoCollapseUI() {
  document.getElementById('autoCollapseToggle').checked = autoCollapseSettings.autoCollapseEnabled;
  document.getElementById('collapseDelayInput').value = autoCollapseSettings.collapseDelay;
}

// Update the auto tab grouping UI with current settings
function updateAutoTabGroupingUI() {
  document.getElementById('autoTabGroupingToggle').checked = autoTabGroupingSettings.autoTabGroupingEnabled;
  document.getElementById('applyToGroupedTabsToggle').checked = autoTabGroupingSettings.applyToGroupedTabs;
  document.getElementById('ignorePinnedTabsToggle').checked = autoTabGroupingSettings.ignorePinnedTabs;
  document.getElementById('autoCloseSingleTabGroupsToggle').checked = autoTabGroupingSettings.autoCloseSingleTabGroups;
  document.getElementById('addTabPositionSelect').value = autoTabGroupingSettings.addTabPosition;
  updateGroupRuleList();
}

// Update the URL list display
function updateUrlList() {
  const container = document.getElementById('urlListContainer');
  container.innerHTML = '';
  
  autoCloseSettings.urlPatterns.forEach((pattern, index) => {
    const item = document.createElement('div');
    item.className = 'url-item';
    item.innerHTML = `
      <code class="url-text" data-index="${index}" title="Click to edit">${pattern}</code>
      <div class="url-item-buttons">
        <button class="edit-btn" data-index="${index}" title="Edit">Edit</button>
        <button class="remove-btn" data-index="${index}" title="Remove">Remove</button>
      </div>
    `;
    container.appendChild(item);
  });
}

// Update the duplicate allow list display
function updateDuplicateAllowList() {
  const container = document.getElementById('duplicateAllowListContainer');
  container.innerHTML = '';
  
  duplicatePreventionSettings.allowedDuplicatePatterns.forEach((pattern, index) => {
    const item = document.createElement('div');
    item.className = 'url-item';
    item.innerHTML = `
      <code class="duplicate-url-text" data-index="${index}" title="Click to edit">${pattern}</code>
      <div class="url-item-buttons">
        <button class="duplicate-edit-btn" data-index="${index}" title="Edit">Edit</button>
        <button class="duplicate-remove-btn" data-index="${index}" title="Remove">Remove</button>
      </div>
    `;
    container.appendChild(item);
  });
}

// Update the group rule list display
function updateGroupRuleList() {
  const container = document.getElementById('groupRuleListContainer');
  container.innerHTML = '';
  
  autoTabGroupingSettings.tabGroupRules.forEach((rule, index) => {
    const item = document.createElement('div');
    item.className = 'group-rule-item';
    item.setAttribute('data-index', index);
    
    // Display patterns count
    const patterns = rule.patterns || [];
    const colorDisplay = rule.groupColor ? ` (${rule.groupColor})` : ' (random)';
    
    item.innerHTML = `
      <div class="group-rule-header">
        <div class="group-rule-info">
          <div class="group-rule-name">${rule.groupName}${colorDisplay}</div>
          <div class="group-rule-pattern">${patterns.length} URL pattern${patterns.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="group-rule-buttons">
          <button class="expand-btn" data-index="${index}" title="Add/Edit URLs">+</button>
          <button class="edit-btn group-rule-edit-btn" data-index="${index}" title="Edit Group">Edit</button>
          <button class="remove-btn group-rule-remove-btn" data-index="${index}" title="Remove">Remove</button>
        </div>
      </div>
      <div class="group-rule-patterns" id="patterns-${index}" style="display: none;">
        ${patterns.map((pattern, patternIndex) => `
          <div class="pattern-item">
            <span class="pattern-text">${pattern}</span>
            <button class="remove-btn remove-pattern-btn" data-rule-index="${index}" data-pattern-index="${patternIndex}" title="Remove">×</button>
          </div>
        `).join('')}
        <div class="add-pattern-form">
          <input type="text" class="pattern-input" placeholder="URL pattern (e.g., *github.com*)" id="pattern-input-${index}">
          <button class="add-pattern-btn" data-rule-index="${index}" title="Add Pattern">Add</button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Start editing a URL pattern
function startEditingUrl(index) {
  const container = document.getElementById('urlListContainer');
  const items = container.querySelectorAll('.url-item');
  const item = items[index];
  
  if (!item || item.classList.contains('editing')) return;
  
  const currentPattern = autoCloseSettings.urlPatterns[index];
  item.classList.add('editing');
  
  item.innerHTML = `
    <input type="text" class="url-edit-input" value="${currentPattern}" data-index="${index}">
    <div class="url-item-buttons">
      <button class="save-btn" data-index="${index}" title="Save">Save</button>
      <button class="cancel-btn" data-index="${index}" title="Cancel">Cancel</button>
    </div>
  `;
  
  // Focus and select the input
  const input = item.querySelector('.url-edit-input');
  input.focus();
  input.select();
  
  // Handle Enter key to save
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveEditedUrl(index, input.value.trim());
    } else if (e.key === 'Escape') {
      cancelEditUrl(index);
    }
  });
}

// Save edited URL pattern
function saveEditedUrl(index, newPattern) {
  if (!newPattern) {
    cancelEditUrl(index);
    return;
  }
  
  // Check if pattern already exists (but allow same pattern at same index)
  const existingIndex = autoCloseSettings.urlPatterns.indexOf(newPattern);
  if (existingIndex !== -1 && existingIndex !== index) {
    alert('This URL pattern already exists!');
    return;
  }
  
  autoCloseSettings.urlPatterns[index] = newPattern;
  updateUrlList();
  saveAutoCloseSettings();
}

// Cancel editing URL pattern
function cancelEditUrl(index) {
  updateUrlList();
}

// Start editing a duplicate allow URL pattern
function startEditingDuplicateAllowUrl(index) {
  const container = document.getElementById('duplicateAllowListContainer');
  const items = container.querySelectorAll('.url-item');
  const item = items[index];
  
  if (!item || item.classList.contains('editing')) return;
  
  const currentPattern = duplicatePreventionSettings.allowedDuplicatePatterns[index];
  item.classList.add('editing');
  
  item.innerHTML = `
    <input type="text" class="duplicate-url-edit-input" value="${currentPattern}" data-index="${index}">
    <div class="url-item-buttons">
      <button class="duplicate-save-btn" data-index="${index}" title="Save">Save</button>
      <button class="duplicate-cancel-btn" data-index="${index}" title="Cancel">Cancel</button>
    </div>
  `;
  
  // Focus and select the input
  const input = item.querySelector('.duplicate-url-edit-input');
  input.focus();
  input.select();
  
  // Handle Enter key to save
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveEditedDuplicateAllowUrl(index, input.value.trim());
    } else if (e.key === 'Escape') {
      cancelEditDuplicateAllowUrl(index);
    }
  });
}

// Save edited duplicate allow URL pattern
function saveEditedDuplicateAllowUrl(index, newPattern) {
  if (!newPattern) {
    cancelEditDuplicateAllowUrl(index);
    return;
  }
  
  // Check if pattern already exists (but allow same pattern at same index)
  const existingIndex = duplicatePreventionSettings.allowedDuplicatePatterns.indexOf(newPattern);
  if (existingIndex !== -1 && existingIndex !== index) {
    alert('This URL pattern already exists!');
    return;
  }
  
  duplicatePreventionSettings.allowedDuplicatePatterns[index] = newPattern;
  updateDuplicateAllowList();
  saveDuplicatePreventionSettings();
}

// Cancel editing duplicate allow URL pattern
function cancelEditDuplicateAllowUrl(index) {
  updateDuplicateAllowList();
}

// Create new group rule (without patterns initially)
function createGroupRule() {
  const nameInput = document.getElementById('groupRuleNameInput');
  const colorSelect = document.getElementById('groupRuleColorSelect');
  
  const groupName = nameInput.value.trim();
  const groupColor = colorSelect.value;
  
  if (!groupName) {
    alert('Please enter a group name');
    return;
  }
  
  // Check if group name already exists
  if (autoTabGroupingSettings.tabGroupRules.some(rule => rule.groupName === groupName)) {
    alert('A group with this name already exists!');
    return;
  }
  
  const newRule = {
    patterns: [],
    groupName,
    ...(groupColor && { groupColor })
  };
  
  autoTabGroupingSettings.tabGroupRules.push(newRule);
  
  // Clear inputs
  nameInput.value = '';
  colorSelect.value = '';
  
  updateGroupRuleList();
  saveAutoTabGroupingSettings();
}

// Add pattern to existing group rule
function addPattern(ruleIndex) {
  const input = document.getElementById(`pattern-input-${ruleIndex}`);
  const pattern = input.value.trim();
  
  if (!pattern) {
    alert('Please enter a URL pattern');
    return;
  }
  
  // Check if pattern already exists in any rule
  const existingRule = autoTabGroupingSettings.tabGroupRules.find(rule => {
    const rulePatterns = rule.patterns || [];
    return rulePatterns.includes(pattern);
  });
  
  if (existingRule) {
    alert('This URL pattern already exists in another group!');
    return;
  }
  
  // Add pattern to the rule
  if (!autoTabGroupingSettings.tabGroupRules[ruleIndex].patterns) {
    autoTabGroupingSettings.tabGroupRules[ruleIndex].patterns = [];
  }
  autoTabGroupingSettings.tabGroupRules[ruleIndex].patterns.push(pattern);
  
  input.value = '';
  updateGroupRuleList();
  saveAutoTabGroupingSettings();
  
  // Trigger regrouping for this rule
  const rule = autoTabGroupingSettings.tabGroupRules[ruleIndex];
  chrome.runtime.sendMessage({
    action: 'groupExistingTabsForRule',
    rule: rule
  }, (response) => {
    if (response && response.success) {
      console.log(`Regrouped existing tabs for rule: ${rule.groupName}`);
    } else {
      console.error('Failed to regroup existing tabs:', response?.error);
    }
  });
  
  // Keep the patterns section expanded
  setTimeout(() => {
    togglePatterns(ruleIndex);
  }, 100);
}

// Remove pattern from group rule
function removePattern(ruleIndex, patternIndex) {
  autoTabGroupingSettings.tabGroupRules[ruleIndex].patterns.splice(patternIndex, 1);
  updateGroupRuleList();
  saveAutoTabGroupingSettings();
  
  // Keep the patterns section expanded
  setTimeout(() => {
    togglePatterns(ruleIndex);
  }, 100);
}

// Toggle patterns section visibility
function togglePatterns(ruleIndex) {
  const patternsDiv = document.getElementById(`patterns-${ruleIndex}`);
  const item = document.querySelector(`[data-index="${ruleIndex}"]`);
  const button = item.querySelector('.expand-btn');
  
  if (patternsDiv.style.display === 'none') {
    patternsDiv.style.display = 'block';
    item.classList.add('group-rule-expanded');
    button.textContent = '−';
    button.title = 'Collapse';
  } else {
    patternsDiv.style.display = 'none';
    item.classList.remove('group-rule-expanded');
    button.textContent = '+';
    button.title = 'Add/Edit URLs';
  }
}

// Add group rule (legacy function - now creates group)
function addGroupRule() {
  createGroupRule();
}

// Remove group rule
function removeGroupRule(index) {
  const rule = autoTabGroupingSettings.tabGroupRules[index];
  if (confirm(`Are you sure you want to delete the "${rule.groupName}" group rule?`)) {
    autoTabGroupingSettings.tabGroupRules.splice(index, 1);
    updateGroupRuleList();
    saveAutoTabGroupingSettings();
  }
}

// Start editing group rule
function startEditingGroupRule(index) {
  const container = document.getElementById('groupRuleListContainer');
  const items = container.querySelectorAll('.group-rule-item');
  const item = items[index];
  
  if (!item || item.classList.contains('editing')) return;
  
  const rule = autoTabGroupingSettings.tabGroupRules[index];
  item.classList.add('editing');
  
  item.innerHTML = `
    <div class="group-rule-edit-form">
      <div class="form-row">
        <span class="form-label">Name:</span>
        <input type="text" class="form-input group-rule-name-edit" value="${rule.groupName}" data-index="${index}">
      </div>
      <div class="form-row">
        <span class="form-label">Color:</span>
        <select class="color-select group-rule-color-edit" data-index="${index}">
          <option value="">Random</option>
          <option value="grey" ${rule.groupColor === 'grey' ? 'selected' : ''}>Grey</option>
          <option value="blue" ${rule.groupColor === 'blue' ? 'selected' : ''}>Blue</option>
          <option value="red" ${rule.groupColor === 'red' ? 'selected' : ''}>Red</option>
          <option value="yellow" ${rule.groupColor === 'yellow' ? 'selected' : ''}>Yellow</option>
          <option value="green" ${rule.groupColor === 'green' ? 'selected' : ''}>Green</option>
          <option value="pink" ${rule.groupColor === 'pink' ? 'selected' : ''}>Pink</option>
          <option value="purple" ${rule.groupColor === 'purple' ? 'selected' : ''}>Purple</option>
          <option value="cyan" ${rule.groupColor === 'cyan' ? 'selected' : ''}>Cyan</option>
          <option value="orange" ${rule.groupColor === 'orange' ? 'selected' : ''}>Orange</option>
        </select>
      </div>
      <div class="form-row">
        <button class="save-btn group-rule-save-btn" data-index="${index}" title="Save">Save</button>
        <button class="cancel-btn group-rule-cancel-btn" data-index="${index}" title="Cancel">Cancel</button>
      </div>
    </div>
  `;
  
  // Focus the name input
  const nameInput = item.querySelector('.group-rule-name-edit');
  nameInput.focus();
  nameInput.select();
}

// Save edited group rule
function saveEditedGroupRule(index) {
  const container = document.getElementById('groupRuleListContainer');
  const items = container.querySelectorAll('.group-rule-item');
  const item = items[index];
  
  const nameInput = item.querySelector('.group-rule-name-edit');
  const colorSelect = item.querySelector('.group-rule-color-edit');
  
  const groupName = nameInput.value.trim();
  const groupColor = colorSelect.value;
  
  if (!groupName) {
    alert('Please enter a group name');
    return;
  }
  
  // Check if group name already exists (but allow same name at same index)
  const existingIndex = autoTabGroupingSettings.tabGroupRules.findIndex((rule, ruleIndex) => {
    return ruleIndex !== index && rule.groupName === groupName;
  });
  
  if (existingIndex !== -1) {
    alert('A group with this name already exists!');
    return;
  }
  
  const updatedRule = {
    patterns: autoTabGroupingSettings.tabGroupRules[index].patterns || [],
    groupName,
    ...(groupColor && { groupColor })
  };
  
  autoTabGroupingSettings.tabGroupRules[index] = updatedRule;
  updateGroupRuleList();
  saveAutoTabGroupingSettings();
}

// Cancel editing group rule
function cancelEditGroupRule(index) {
  updateGroupRuleList();
}

// Add URL pattern
function addUrlPattern() {
  const input = document.getElementById('urlInput');
  const pattern = input.value.trim();
  
  if (pattern && !autoCloseSettings.urlPatterns.includes(pattern)) {
    autoCloseSettings.urlPatterns.push(pattern);
    input.value = '';
    updateUrlList();
    saveAutoCloseSettings();
  }
}

// Add duplicate allow pattern
function addDuplicateAllowPattern() {
  const input = document.getElementById('duplicateAllowInput');
  const pattern = input.value.trim();
  
  if (pattern && !duplicatePreventionSettings.allowedDuplicatePatterns.includes(pattern)) {
    duplicatePreventionSettings.allowedDuplicatePatterns.push(pattern);
    input.value = '';
    updateDuplicateAllowList();
    saveDuplicatePreventionSettings();
  }
}

// Remove URL pattern
function removeUrlPattern(index) {
  autoCloseSettings.urlPatterns.splice(index, 1);
  updateUrlList();
  saveAutoCloseSettings();
}

// Remove duplicate allow pattern
function removeDuplicateAllowPattern(index) {
  duplicatePreventionSettings.allowedDuplicatePatterns.splice(index, 1);
  updateDuplicateAllowList();
  saveDuplicatePreventionSettings();
}

// Toggle menu visibility
function toggleMenu(headerId, contentId) {
  const header = document.getElementById(headerId);
  const content = document.getElementById(contentId);
  const arrow = header.querySelector('.menu-arrow');
  
  const isExpanded = content.classList.contains('expanded');
  
  if (isExpanded) {
    content.classList.remove('expanded');
    arrow.classList.remove('expanded');
  } else {
    content.classList.add('expanded');
    arrow.classList.add('expanded');
  }
}

// Function to get and display the current tab count and group info
async function updateTabCount() {
  try {
    const tabs = await chrome.tabs.query({});
    const tabCount = tabs.length;
    
    const tabCountElement = document.getElementById('tabCount');
    tabCountElement.textContent = tabCount;
    
    // Get tab groups information
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      const tabGroups = await chrome.tabGroups.query({ windowId: activeTab.windowId });
      const groupCountElement = document.getElementById('groupCount');
      groupCountElement.textContent = tabGroups.length;
    }
    
    console.log(`Popup shows: ${tabCount} tabs`);
  } catch (error) {
    console.error('Error getting tab count:', error);
    document.getElementById('tabCount').textContent = '?';
    document.getElementById('groupCount').textContent = '?';
  }
}

// Function to expand all tab groups
async function expandAllGroups() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;
    
    const tabGroups = await chrome.tabGroups.query({ windowId: activeTab.windowId });
    
    for (const group of tabGroups) {
      if (group.collapsed) {
        await chrome.tabGroups.update(group.id, { collapsed: false });
      }
    }
    
    console.log(`Expanded ${tabGroups.length} tab groups`);
    updateTabCount();
  } catch (error) {
    console.error('Error expanding groups:', error);
  }
}

// Function to collapse all tab groups except the active one
async function collapseAllGroups() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;
    
    const tabGroups = await chrome.tabGroups.query({ windowId: activeTab.windowId });
    const activeGroupId = activeTab.groupId;
    
    for (const group of tabGroups) {
      // Don't collapse the group containing the active tab
      if (group.id !== activeGroupId && !group.collapsed) {
        await chrome.tabGroups.update(group.id, { collapsed: true });
      }
    }
    
    console.log('Collapsed all inactive tab groups');
    updateTabCount();
  } catch (error) {
    console.error('Error collapsing groups:', error);
  }
}

// Function to regroup all tabs based on current rules
async function regroupAllTabs() {
  try {
    console.log('Regrouping all tabs based on current rules...');
    
    // Send message to background script to regroup all tabs
    const response = await chrome.runtime.sendMessage({ action: 'groupExistingTabs' });
    
    if (response && response.success) {
      console.log('Successfully regrouped all tabs');
      // Update the tab count and group info
      setTimeout(updateTabCount, 500);
    } else {
      console.error('Failed to regroup tabs:', response?.error);
    }
  } catch (error) {
    console.error('Error regrouping tabs:', error);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Update tab count when popup opens
  updateTabCount();
  
  // Load settings
  // Determine if this window is named, and if not, show a minimal init view
  (async () => {
    try {
      const windowId = await getCurrentBrowserWindowId();
      if (!windowId) return;
      chrome.runtime.sendMessage({ type: 'getWindowLabel', windowId }, (resp) => {
        const label = resp && resp.label ? resp.label : '';
        const headerTitle = document.getElementById('headerTitle');
        const explorerRoot = document.getElementById('explorerRoot');
        const settingsRoot = document.getElementById('settingsRoot');
        const initRoot = document.getElementById('initRoot');
        const popoutBtn = document.getElementById('popoutBtn');
        const headerRefreshBtn = document.getElementById('headerRefreshBtn');
        const openSettingsBtn = document.getElementById('openSettingsBtn');
        if (!label) {
          // Show init-only UI
          if (headerTitle) headerTitle.textContent = 'Name this window';
          if (explorerRoot) explorerRoot.style.display = 'none';
          if (settingsRoot) settingsRoot.style.display = 'none';
          if (initRoot) initRoot.style.display = 'block';
          if (popoutBtn) popoutBtn.style.display = 'none';
          if (headerRefreshBtn) headerRefreshBtn.style.display = 'none';
          if (openSettingsBtn) openSettingsBtn.style.display = 'none';
          const initInput = document.getElementById('initWindowLabelInput');
          if (initInput) initInput.focus();
          // Initialize init toggle from per-window state (defaults to true)
          const initToggle = document.getElementById('initWindowLabelPrefixToggle');
          chrome.runtime.sendMessage({ type: 'getWindowLabelPrefixEnabled', windowId }, (r) => {
            if (initToggle) initToggle.checked = !!(r && r.ok ? r.enabled : true);
          });
        } else {
          const input = document.getElementById('windowLabelInput');
          if (input) input.value = label;
        }
      });
    } catch (e) {
      console.error('Error loading window id for label', e);
    }
  })();

  // Initialize and wire the "Show label prefix on page titles" toggle (per-window)
  (async () => {
    try {
      const windowId = await getCurrentBrowserWindowId();
      if (!windowId) return;
      chrome.runtime.sendMessage({ type: 'getWindowLabelPrefixEnabled', windowId }, (resp) => {
        const toggle = document.getElementById('windowLabelPrefixToggle');
        if (toggle) toggle.checked = !!(resp && resp.ok ? resp.enabled : true);
      });
    } catch (e) {
      console.error('Error loading per-window label prefix setting', e);
    }
  })();

  const prefixToggle = document.getElementById('windowLabelPrefixToggle');
  if (prefixToggle) {
    prefixToggle.addEventListener('change', async (e) => {
      try {
        const windowId = await getCurrentBrowserWindowId();
        if (!windowId) return;
        // Persist per-window and immediately apply/clear on current window
        chrome.runtime.sendMessage({ type: 'applyWindowLabelPrefix', enabled: e.target.checked, windowId }, () => {});
      } catch (err) {
        console.error('Failed to apply window label prefix setting', err);
      }
    });
  }

  // openNamePromptBtn removed; init flow handles naming within popup

  // Save window label
  document.getElementById('saveWindowLabelBtn').addEventListener('click', async () => {
    try {
      const windowId = await getCurrentBrowserWindowId();
      if (!windowId) return;
      const label = document.getElementById('windowLabelInput').value.trim();
      chrome.runtime.sendMessage({ type: 'setWindowLabel', windowId, label }, (resp) => {
        if (resp && resp.ok) {
          // close popup to apply quickly
          window.close();
        } else if (resp && resp.error) {
          alert('Failed to save label: ' + resp.error);
        }
      });
    } catch (e) {
      console.error('Error saving window label', e);
    }
  });

  // Save from init view and refresh the popup
  const initSaveBtn = document.getElementById('initSaveWindowLabelBtn');
  if (initSaveBtn) {
    initSaveBtn.addEventListener('click', async () => {
      try {
        const windowId = await getCurrentBrowserWindowId();
        if (!windowId) return;
        const label = document.getElementById('initWindowLabelInput').value.trim();
        const initToggle = document.getElementById('initWindowLabelPrefixToggle');
        const prefixEnabled = initToggle ? !!initToggle.checked : true;
        chrome.runtime.sendMessage({ type: 'setWindowLabel', windowId, label }, async (resp) => {
          if (resp && resp.ok) {
            // Apply/clear prefix immediately for this window
            chrome.runtime.sendMessage({ type: 'applyWindowLabelPrefix', enabled: prefixEnabled, windowId }, () => {});
            // Transition UI to full explorer without requiring reopen
            try {
              const headerTitle = document.getElementById('headerTitle');
              const explorerRoot = document.getElementById('explorerRoot');
              const settingsRoot = document.getElementById('settingsRoot');
              const initRoot = document.getElementById('initRoot');
              if (headerTitle) headerTitle.textContent = 'Tab Explorer';
              if (explorerRoot) explorerRoot.style.display = '';
              if (settingsRoot) settingsRoot.style.display = '';
              if (initRoot) initRoot.style.display = 'none';
              const settingsInput = document.getElementById('windowLabelInput');
              if (settingsInput) settingsInput.value = label;
              const settingsToggle = document.getElementById('windowLabelPrefixToggle');
              if (settingsToggle) settingsToggle.checked = prefixEnabled;
              // Refresh counts and list
              try { await updateTabCount(); } catch {}
              try { await buildWindowExplorer(); } catch {}
            } catch {}
          } else if (resp && resp.error) {
            alert('Failed to save label: ' + resp.error);
          }
        });
      } catch (e) {
        console.error('Error saving window label from init', e);
      }
    });
  }

  // Export settings as JSON
  document.getElementById('exportSettingsBtn').addEventListener('click', async () => {
    try {
      // Read all relevant keys from chrome.storage.sync
      const all = await chrome.storage.sync.get(null);
      const payload = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: all
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chrome-tab-manager-settings.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export settings: ' + e.message);
    }
  });

  // Import settings from JSON file
  const importFileInput = document.getElementById('importFileInput');
  document.getElementById('importSettingsBtn').addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (!obj) {
        alert('Invalid settings file');
        return;
      }

      // Support both wrapped format { version, timestamp, settings: {...} }
      // and older/alternative exports that are just the settings object itself.
      let settingsToImport = null;
      if (obj.settings && typeof obj.settings === 'object') {
        settingsToImport = obj.settings;
      } else {
        // Heuristic: treat as settings object if it contains at least one known setting key
        const knownKeys = ['autoCloseEnabled', 'autoTabGroupingEnabled', 'duplicatePreventionEnabled', 'tabGroupRules', 'addTabPosition'];
        const hasKnown = knownKeys.some(k => Object.prototype.hasOwnProperty.call(obj, k));
        if (hasKnown) {
          settingsToImport = obj;
        }
      }

      if (!settingsToImport) {
        alert('Invalid settings file format. Expected exported settings JSON.');
        return;
      }

      if (!confirm('Importing will overwrite your current settings in sync storage. Continue?')) return;
      await chrome.storage.sync.set(settingsToImport);
      alert('Settings imported. The popup will reload to reflect changes.');
      window.location.reload();
    } catch (err) {
      alert('Failed to import settings: ' + err.message);
    }
  });
  loadAutoCloseSettings();
  loadDuplicatePreventionSettings();
  loadAutoCollapseSettings();
  loadAutoTabGroupingSettings();
  
  // Header refresh button: refresh counts and rebuild explorer view
  const headerRefreshBtn = document.getElementById('headerRefreshBtn');
  if (headerRefreshBtn) {
    let refreshCooldown = false;
    headerRefreshBtn.addEventListener('click', async () => {
      if (refreshCooldown) return;
      refreshCooldown = true;
      // Add loading state and spin the icon path
      headerRefreshBtn.classList.add('loading');
      const svg = headerRefreshBtn.querySelector('svg');
      const path = svg ? svg.querySelector('path') : null;
      if (path) path.classList.add('spin');
      try {
        await updateTabCount();
        await buildWindowExplorer();
      } catch (e) {
        console.error('Header refresh failed', e);
      } finally {
        // brief cooldown to debounce rapid clicks
        setTimeout(() => {
          refreshCooldown = false;
        }, 400);
        headerRefreshBtn.classList.remove('loading');
        if (path) path.classList.remove('spin');
      }
    });
  }
  document.getElementById('regroupAllBtn').addEventListener('click', () => {
    if (confirm('Regroup all tabs based on current tab grouping rules?')) {
      regroupAllTabs();
    }
  });
  // Default to Explorer view; wire settings gear and popout
  const explorerRoot = document.getElementById('explorerRoot');
  const settingsRoot = document.getElementById('settingsRoot');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const settingsIcon = document.getElementById('settingsIcon');
  const headerTitle = document.getElementById('headerTitle');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      const showingExplorer = explorerRoot.style.display !== 'none';
      if (showingExplorer) {
        explorerRoot.style.display = 'none';
        settingsRoot.style.display = 'block';
        // Switch to back chevron for Settings view
        if (settingsIcon) settingsIcon.innerHTML = '<path class="line-icon" d="M15 6l-6 6 6 6" />';
        if (headerTitle) headerTitle.textContent = 'Settings';
      } else {
        settingsRoot.style.display = 'none';
        explorerRoot.style.display = 'block';
        // Switch back to gear icon
        if (settingsIcon) settingsIcon.innerHTML = '<path d="M19.43 12.98c.04-.32.07-.66.07-1s-.03-.68-.07-1l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.03 7.03 0 0 0-1.73-1l-.38-2.65A.5.5 0 0 0 13 2h-4a.5.5 0 0 0-.5.42l-.38 2.65a7.03 7.03 0 0 0-1.73 1l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0-.12.64L4.57 10c-.04.32-.07.66-.07 1s.03.68.07 1l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.69.22l2.49-1c.53.42 1.11.77 1.73 1l.38 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.38-2.65c.62-.23 1.2-.58 1.73-1l2.49 1c.26.12.55.02.69-.22l2-3.46a.5.5 0 0 0-.12-.64L19.43 12.98zM11 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />';
        if (headerTitle) headerTitle.textContent = 'Tab Explorer';
      }
    });
  }
  // Popout button removed per design; keep standalone style support if opened via ?standalone=1
  try {
    const url = new URL(window.location.href);
    const isStandalone = url.searchParams.get('standalone') === '1';
    if (isStandalone) {
      document.body.classList.add('standalone');
    }
  } catch {}

  // Rebuild when filters/sorts change
  const filterSelect = document.getElementById('windowFilterSelect');
  const sortSelect = document.getElementById('windowSortSelect');
  if (filterSelect) filterSelect.addEventListener('change', () => buildWindowExplorer());
  if (sortSelect) sortSelect.addEventListener('change', () => buildWindowExplorer());

  document.getElementById('windowSearchInput').addEventListener('input', (e) => {
    // Rebuild to support the alternate grouped-by-title layout when filtering
    buildWindowExplorer();
  });

  // Build explorer on open by default
  buildWindowExplorer();

  async function buildWindowExplorer() {
    const container = document.getElementById('windowListContainer');
    container.innerHTML = '';
    try {
      // get windows and their tabs
      const windows = await chrome.windows.getAll({ populate: true });
      const labels = await new Promise(resolve => chrome.runtime.sendMessage({ type: 'getAllWindowLabels' }, resolve));
      const labelMap = (labels && labels.labels) ? labels.labels : {};
      const filterMode = (document.getElementById('windowFilterSelect')?.value) || 'all';
      const sortMode = (document.getElementById('windowSortSelect')?.value) || 'title-asc';

      // Helper: escape a string for use in RegExp
      const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Helper: strip a window label prefix like "[Label] " from a title, but only
      // if it matches the known label for that window. This avoids stripping
      // legitimate bracketed prefixes in real page titles.
      const stripWindowLabel = (title, windowId) => {
        const lbl = labelMap[String(windowId)];
        if (!lbl) return title || '(no title)';
        try {
          const re = new RegExp('^\\[' + escapeRegExp(lbl) + '\\]\\s*');
          const base = (title || '(no title)').replace(re, '').trim();
          return base || '(no title)';
        } catch {
          return title || '(no title)';
        }
      };

      // Gather all tabs with rich metadata
      const allTabs = [];
      for (const w of windows) {
        for (const t of w.tabs) {
          allTabs.push({
            windowId: w.id,
            groupId: t.groupId,
            tabId: t.id,
            title: t.title || '(no title)',
            url: t.url || '',
            lastAccessed: t.lastAccessed || 0
          });
        }
      }

      // Helper: normalize URL for duplicate detection (match background.js)
      const normalizeUrl = (url) => {
        try { const u = new URL(url); u.hash = ''; return u.toString(); } catch { return url; }
      };

      // Filter
      let filteredTabs = allTabs.slice();
      if (filterMode === 'duplicates') {
        // Group by normalized URL and include all members of any group with count > 1
        const byUrl = new Map();
        for (const t of allTabs) {
          const key = normalizeUrl(t.url);
          if (!byUrl.has(key)) byUrl.set(key, []);
          byUrl.get(key).push(t);
        }
        const allDups = [];
        for (const list of byUrl.values()) {
          if (list.length > 1) allDups.push(...list);
        }
        filteredTabs = allDups;
      } else if (filterMode === 'autoclose') {
        const ac = await chrome.storage.sync.get({ autoCloseEnabled: false, urlPatterns: [] });
        const patterns = ac.urlPatterns || [];
        const matchesPattern = (url, pattern) => {
          try {
            if (!pattern || !url) return false;
            let rp = '';
            for (let i = 0; i < pattern.length; i++) {
              const ch = pattern[i];
              if (ch === '*') rp += '.*'; else if (/[.+^${}()|[\]\\]/.test(ch)) rp += '\\' + ch; else rp += ch;
            }
            const re = new RegExp('^' + rp + '$', 'i');
            return re.test(url);
          } catch { return false; }
        };
        filteredTabs = allTabs.filter(t => patterns.some(p => matchesPattern(t.url, p)));
      }

      // Sort
      const cmp = {
        'title-asc': (a, b) => a.title.localeCompare(b.title),
        'lastAccessed-desc': (a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0)
      }[sortMode] || ((a, b) => a.title.localeCompare(b.title));
      filteredTabs.sort(cmp);

      const searchQ = (document.getElementById('windowSearchInput')?.value || '').toLowerCase();
      const searchFilter = (tab) => {
        if (!searchQ) return true;
        return (tab.title || '').toLowerCase().includes(searchQ) || (tab.url || '').toLowerCase().includes(searchQ);
      };

      const usingTopLevelByTitle = filterMode !== 'all' || !!searchQ;

      if (usingTopLevelByTitle) {
        // New layout: Top-level by page title -> then by window -> then by group
        // Build map title -> windowId -> groupId -> tabs[]
        const byTitle = new Map();
        for (const t of filteredTabs) {
          if (!searchFilter(t)) continue;
          const baseTitle = stripWindowLabel(t.title, t.windowId);
          if (!byTitle.has(baseTitle)) byTitle.set(baseTitle, new Map());
          const mWin = byTitle.get(baseTitle);
          if (!mWin.has(t.windowId)) mWin.set(t.windowId, new Map());
          const mGrp = mWin.get(t.windowId);
          const gk = t.groupId === -1 ? 'ungrouped' : String(t.groupId);
          if (!mGrp.has(gk)) mGrp.set(gk, []);
          mGrp.get(gk).push(t);
        }

        // Render titles in a responsive grid; collapsed by default
        const titleGrid = document.createElement('div');
        titleGrid.className = 'explorer-title-grid';
        container.appendChild(titleGrid);

        // Sort titles alphabetically by base title for stable display
        const sortedEntries = Array.from(byTitle.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [title, winMap] of sortedEntries) {
          const titleDiv = document.createElement('div');
          titleDiv.className = 'menu-section explorer-title';
          const headerEl = document.createElement('div');
          headerEl.className = 'menu-header';
          // Count total tabs under this title across windows/groups
          let totalCount = 0;
          for (const m of winMap.values()) { for (const tabs of m.values()) totalCount += tabs.length; }
          headerEl.innerHTML = `<span>${escapeHtml(title)}</span><span class="count-badge">${totalCount}</span><span class="menu-arrow">▶</span>`;
          const contentEl = document.createElement('div');
          contentEl.className = 'menu-content';
          contentEl.style.display = 'none';

          // windows under this title
          for (const [winId, grpMap] of winMap.entries()) {
            const winLabel = labelMap[String(winId)] || '';
            const headerTitle = winLabel ? `${winLabel}` : `Window ${winId}`;
            const winSection = document.createElement('div');
            winSection.className = 'menu-section explorer-window';
            const wHeader = document.createElement('div');
            wHeader.className = 'menu-header';
            wHeader.innerHTML = `<span>${escapeHtml(headerTitle)}</span><span class="menu-arrow">▶</span>`;
            const wContent = document.createElement('div');
            wContent.className = 'menu-content';
            wContent.style.display = 'none';

            const groupsContainer = document.createElement('div');
            groupsContainer.style.padding = '8px';
            groupsContainer.innerHTML = `<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Groups & Tabs</div>`;

            for (const [gid, tabs] of grpMap.entries()) {
              const groupContainer = document.createElement('div');
              groupContainer.className = 'group-rule-item explorer-group';
              let groupTitle = 'Ungrouped';
              if (gid !== 'ungrouped') {
                try {
                  const tg = await chrome.tabGroups.get(Number(gid));
                  groupTitle = tg && tg.title ? tg.title : `Group ${gid}`;
                } catch { groupTitle = `Group ${gid}`; }
              }
              const gHeader = document.createElement('div');
              gHeader.className = 'group-rule-header explorer-group-header';
              gHeader.innerHTML = `<div class="group-rule-name">${escapeHtml(groupTitle)}</div><span class="menu-arrow">▶</span>`;
              const gContent = document.createElement('div');
              gContent.className = 'explorer-group-content';
              gContent.style.display = 'none';

              for (const tab of tabs) {
                const baseTitle = stripWindowLabel(tab.title, tab.windowId);
                const tEl = document.createElement('div');
                tEl.className = 'url-item explorer-tab-item';
                tEl.style.margin = '6px 0';
                tEl.dataset.title = String(tab.title || '(no title)');
                tEl.dataset.url = String(tab.url || '');
                tEl.dataset.tabid = String(tab.tabId);
                tEl.dataset.windowid = String(tab.windowId);
                tEl.dataset.groupid = String(gid === 'ungrouped' ? '-1' : gid);
                tEl.innerHTML = `
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:600;color:#111827;">${escapeHtml(baseTitle)}</div>
                  </div>
                  <div style="margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;">
                    <button class="close-tab-btn" title="Close tab" data-tabid="${tab.tabId}">✕</button>
                  </div>
                `;
                gContent.appendChild(tEl);
              }
              groupContainer.appendChild(gHeader);
              groupContainer.appendChild(gContent);
              groupsContainer.appendChild(groupContainer);
            }

            wContent.appendChild(groupsContainer);
            winSection.appendChild(wHeader);
            winSection.appendChild(wContent);
            contentEl.appendChild(winSection);

            // toggles
            wHeader.addEventListener('click', () => {
              const expand = wContent.style.display === 'none';
              wContent.style.display = expand ? 'block' : 'none';
              const arrow = wHeader.querySelector('.menu-arrow');
              if (arrow) arrow.classList.toggle('expanded', expand);
            });
          }

          titleGrid.appendChild(titleDiv);
          titleDiv.appendChild(headerEl);
          titleDiv.appendChild(contentEl);
          headerEl.addEventListener('click', () => {
            const expand = contentEl.style.display === 'none';
            contentEl.style.display = expand ? 'block' : 'none';
            const arrow = headerEl.querySelector('.menu-arrow');
            if (arrow) arrow.classList.toggle('expanded', expand);
          });

          // Wire group toggles inside titles
          contentEl.querySelectorAll('.explorer-group-header').forEach(h => {
            h.addEventListener('click', () => {
              const gc = h.parentElement.querySelector('.explorer-group-content');
              if (gc) {
                const expand = gc.style.display === 'none';
                gc.style.display = expand ? 'block' : 'none';
                const arrow = h.querySelector('.menu-arrow');
                if (arrow) arrow.classList.toggle('expanded', expand);
              }
            });
          });
        }
      } else {
        // Original layout by window -> group -> tabs
        for (const w of windows) {
          const winDiv = document.createElement('div');
          winDiv.className = 'menu-section explorer-window';
          const winLabel = labelMap[String(w.id)] || '';
          const headerTitle = winLabel ? `${winLabel}` : `Window ${w.id}`;
          const headerEl = document.createElement('div');
          headerEl.className = 'menu-header';
          headerEl.innerHTML = `<span>${escapeHtml(headerTitle)}</span><span class=\"menu-arrow\">▶</span>`;
          const contentEl = document.createElement('div');
          contentEl.className = 'menu-content';
          contentEl.style.display = 'none';
          contentEl.innerHTML = `
              <div style=\"padding:8px;\">
                <div style=\"font-size:12px;color:#6b7280;margin-bottom:6px;\">Groups & Tabs</div>
                <div id=\"window-${w.id}-groups\"></div>
              </div>
          `;
          winDiv.appendChild(headerEl);
          winDiv.appendChild(contentEl);
          container.appendChild(winDiv);

          const groups = {};
          for (const t of w.tabs) {
            const gid = t.groupId === -1 ? 'ungrouped' : String(t.groupId);
            if (!groups[gid]) groups[gid] = [];
            groups[gid].push(t);
          }

          const groupsContainer = winDiv.querySelector(`#window-${w.id}-groups`);
          for (const [gid, tabs] of Object.entries(groups)) {
            const groupContainer = document.createElement('div');
            groupContainer.className = 'group-rule-item explorer-group';
            let groupTitle = 'Ungrouped';
            if (gid !== 'ungrouped') {
              try {
                const tg = await chrome.tabGroups.get(Number(gid));
                groupTitle = tg && tg.title ? tg.title : `Group ${gid}`;
              } catch { groupTitle = `Group ${gid}`; }
            }
            const groupHeader = document.createElement('div');
            groupHeader.className = 'group-rule-header explorer-group-header';
            groupHeader.innerHTML = `<div class=\"group-rule-name\">${escapeHtml(groupTitle)}</div><span class=\"menu-arrow\">▶</span>`;
            const groupContent = document.createElement('div');
            groupContent.className = 'explorer-group-content';
            groupContent.style.display = 'none';

            for (const tab of tabs) {
              if (!searchFilter({ title: tab.title, url: tab.url })) continue;
              const tEl = document.createElement('div');
              tEl.className = 'url-item explorer-tab-item';
              tEl.style.margin = '6px 0';
              tEl.dataset.title = String(tab.title || '(no title)');
              tEl.dataset.url = String(tab.url || '');
              tEl.dataset.tabid = String(tab.id);
              tEl.dataset.windowid = String(w.id);
              tEl.dataset.groupid = String(gid === 'ungrouped' ? '-1' : gid);
              tEl.innerHTML = `
                <div style=\"flex:1;min-width:0;\">\
                  <div style=\"font-size:13px;font-weight:600;color:#111827;\">${escapeHtml(tab.title || '(no title)')}</div>\
                </div>
                <div style=\"margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;\">\
                  <button class=\"close-tab-btn\" title=\"Close tab\" data-tabid=\"${tab.id}\">✕</button>\
                </div>
              `;
              groupContent.appendChild(tEl);
            }

            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(groupContent);
            groupsContainer.appendChild(groupContainer);
          }

          headerEl.addEventListener('click', () => {
            const expand = contentEl.style.display === 'none';
            contentEl.style.display = expand ? 'block' : 'none';
            const arrow = headerEl.querySelector('.menu-arrow');
            if (arrow) arrow.classList.toggle('expanded', expand);
          });
          groupsContainer.querySelectorAll('.explorer-group-header').forEach(h => {
            h.addEventListener('click', () => {
              const gc = h.parentElement.querySelector('.explorer-group-content');
              if (gc) {
                const expand = gc.style.display === 'none';
                gc.style.display = expand ? 'block' : 'none';
                const arrow = h.querySelector('.menu-arrow');
                if (arrow) arrow.classList.toggle('expanded', expand);
              }
            });
          });
        }
      }

      // wire up tab click to activate
      container.querySelectorAll('.explorer-tab-item').forEach(item => {
        item.addEventListener('click', async (e) => {
          // Ignore clicks on the close button
          if (e.target && e.target.classList.contains('close-tab-btn')) return;
          const tabId = Number(item.dataset.tabid);
          const windowId = Number(item.dataset.windowid);
          const groupId = Number(item.dataset.groupid);
          try {
            chrome.runtime.sendMessage({ type: 'activateTab', tabId, windowId, groupId }, () => {});
            window.close();
          } catch (err) {
            console.error('Failed to go to tab', err);
          }
        });
      });

      // wire up close buttons
      container.querySelectorAll('.close-tab-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const tabId = Number(btn.getAttribute('data-tabid'));
          try {
            chrome.runtime.sendMessage({ type: 'closeTab', tabId }, () => {});
            // Optimistically remove from UI
            const parent = btn.closest('.explorer-tab-item');
            if (parent) parent.remove();
            // Then refresh counts and lists to keep duplicate filters current
            setTimeout(async () => {
              try {
                await updateTabCount();
                await buildWindowExplorer();
              } catch {}
            }, 100);
          } catch (err) {
            console.error('Failed to close tab', err);
          }
        });
      });
    } catch (err) {
      console.error('Error building window explorer', err);
    }
  }

  function filterWindowExplorer(q) {
    const container = document.getElementById('windowListContainer');
    const query = (q || '').toLowerCase();
    const windows = Array.from(container.querySelectorAll('.explorer-window'));

    // Helper to collapse all by default
    const collapseAll = () => {
      windows.forEach(w => {
        const content = w.querySelector('.menu-content');
        if (content) content.style.display = 'none';
        w.querySelectorAll('.explorer-group-content').forEach(gc => { gc.setAttribute('data-collapsed', 'true'); gc.style.display = 'none'; });
        // show all tabs
        w.querySelectorAll('.explorer-tab-item').forEach(t => { t.style.display = 'block'; });
        // show all groups/windows
        w.style.display = 'block';
        w.querySelectorAll('.explorer-group').forEach(g => { g.style.display = 'block'; });
      });
    };

    if (!query) {
      collapseAll();
      return;
    }

    // When searching, hide everything by default, then show matches and expand parents
    windows.forEach(w => {
      let windowHasMatch = false;
      const groups = Array.from(w.querySelectorAll('.explorer-group'));
      groups.forEach(g => {
        let groupHasMatch = false;
        const tabs = Array.from(g.querySelectorAll('.explorer-tab-item'));
        tabs.forEach(t => {
          const title = (t.dataset.title || '').toLowerCase();
          const url = (t.dataset.url || '').toLowerCase();
          const match = title.includes(query) || url.includes(query);
          t.style.display = match ? 'block' : 'none';
          if (match) groupHasMatch = true;
        });
        // Group visibility & expansion
        g.style.display = groupHasMatch ? 'block' : 'none';
        const gc = g.querySelector('.explorer-group-content');
        if (gc) gc.style.display = groupHasMatch ? 'block' : 'none';
        if (groupHasMatch) windowHasMatch = true;
      });
      // Window visibility & expansion
      w.style.display = windowHasMatch ? 'block' : 'none';
      const wc = w.querySelector('.menu-content');
      if (wc) {
        wc.style.display = windowHasMatch ? 'block' : 'none';
        // Update arrow state
        const arrow = w.querySelector('.menu-header .menu-arrow');
        if (arrow) arrow.classList.toggle('expanded', windowHasMatch);
      }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function(c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]; });
  }
  
  // Add group management event listeners
  document.getElementById('expandAllBtn').addEventListener('click', expandAllGroups);
  document.getElementById('collapseAllBtn').addEventListener('click', collapseAllGroups);
  
  // Add auto-collapse menu event listeners
  document.getElementById('autoCollapseHeader').addEventListener('click', () => {
    toggleMenu('autoCollapseHeader', 'autoCollapseContent');
  });

  // Collapsible: Window Name and Import/Export sections
  const windowNameHeader = document.getElementById('windowNameHeader');
  if (windowNameHeader) windowNameHeader.addEventListener('click', () => toggleMenu('windowNameHeader', 'windowNameContent'));
  const importExportHeader = document.getElementById('importExportHeader');
  if (importExportHeader) importExportHeader.addEventListener('click', () => toggleMenu('importExportHeader', 'importExportContent'));
  
  document.getElementById('autoCollapseToggle').addEventListener('change', (e) => {
    autoCollapseSettings.autoCollapseEnabled = e.target.checked;
    saveAutoCollapseSettings();
  });
  
  document.getElementById('collapseDelayInput').addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= 30) {
      autoCollapseSettings.collapseDelay = value;
      saveAutoCollapseSettings();
    }
  });
  
  // Add auto-close menu event listeners
  document.getElementById('autoCloseHeader').addEventListener('click', () => {
    toggleMenu('autoCloseHeader', 'autoCloseContent');
  });
  
  document.getElementById('autoCloseToggle').addEventListener('change', (e) => {
    autoCloseSettings.autoCloseEnabled = e.target.checked;
    saveAutoCloseSettings();
  });
  
  document.getElementById('closeDelayInput').addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= 300) {
      autoCloseSettings.closeDelay = value;
      saveAutoCloseSettings();
    }
  });
  const autoCloseBannerToggle = document.getElementById('autoCloseBannerToggle');
  if (autoCloseBannerToggle) autoCloseBannerToggle.addEventListener('change', (e) => {
    autoCloseSettings.autoCloseBannerEnabled = e.target.checked;
    saveAutoCloseSettings();
  });
  
  document.getElementById('addUrlBtn').addEventListener('click', addUrlPattern);
  
  document.getElementById('urlInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addUrlPattern();
    }
  });
  
  // Add duplicate prevention menu event listeners
  document.getElementById('duplicatePreventionHeader').addEventListener('click', () => {
    toggleMenu('duplicatePreventionHeader', 'duplicatePreventionContent');
  });
  
  document.getElementById('duplicatePreventionToggle').addEventListener('change', (e) => {
    duplicatePreventionSettings.duplicatePreventionEnabled = e.target.checked;
    saveDuplicatePreventionSettings();
  });
  
  document.getElementById('duplicateActionSelect').addEventListener('change', (e) => {
    duplicatePreventionSettings.closeOlderTab = e.target.value === 'true';
    saveDuplicatePreventionSettings();
  });

  const duplicateBannerToggle = document.getElementById('duplicateBannerToggle');
  if (duplicateBannerToggle) duplicateBannerToggle.addEventListener('change', (e) => {
    duplicatePreventionSettings.duplicateBannerEnabled = e.target.checked;
    saveDuplicatePreventionSettings();
  });

  const duplicateBannerDelayInput = document.getElementById('duplicateBannerDelayInput');
  if (duplicateBannerDelayInput) duplicateBannerDelayInput.addEventListener('change', (e) => {
    const v = parseInt(e.target.value);
    if (Number.isFinite(v) && v >= 1 && v <= 300) {
      duplicatePreventionSettings.duplicateBannerDelaySeconds = v;
      saveDuplicatePreventionSettings();
    }
  });
  
  document.getElementById('addDuplicateAllowBtn').addEventListener('click', addDuplicateAllowPattern);
  
  document.getElementById('duplicateAllowInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addDuplicateAllowPattern();
    }
  });
  
  // Add auto tab grouping menu event listeners
  document.getElementById('autoTabGroupingHeader').addEventListener('click', () => {
    toggleMenu('autoTabGroupingHeader', 'autoTabGroupingContent');
  });
  
  document.getElementById('autoTabGroupingToggle').addEventListener('change', (e) => {
    autoTabGroupingSettings.autoTabGroupingEnabled = e.target.checked;
    saveAutoTabGroupingSettings();
  });
  
  document.getElementById('applyToGroupedTabsToggle').addEventListener('change', (e) => {
    autoTabGroupingSettings.applyToGroupedTabs = e.target.checked;
    saveAutoTabGroupingSettings();
  });
  
  document.getElementById('ignorePinnedTabsToggle').addEventListener('change', (e) => {
    autoTabGroupingSettings.ignorePinnedTabs = e.target.checked;
    saveAutoTabGroupingSettings();
  });
  
  document.getElementById('autoCloseSingleTabGroupsToggle').addEventListener('change', (e) => {
    autoTabGroupingSettings.autoCloseSingleTabGroups = e.target.checked;
    saveAutoTabGroupingSettings();
  });
  
  document.getElementById('addTabPositionSelect').addEventListener('change', (e) => {
    autoTabGroupingSettings.addTabPosition = e.target.value;
    saveAutoTabGroupingSettings();
  });
  
  document.getElementById('createGroupRuleBtn').addEventListener('click', createGroupRule);
  
  document.getElementById('groupRuleNameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createGroupRule();
    }
  });
  
  // Handle URL list button clicks (event delegation)
  document.getElementById('urlListContainer').addEventListener('click', (e) => {
    const index = parseInt(e.target.getAttribute('data-index'));
    
    if (e.target.classList.contains('remove-btn')) {
      removeUrlPattern(index);
    } else if (e.target.classList.contains('edit-btn')) {
      startEditingUrl(index);
    } else if (e.target.classList.contains('save-btn')) {
      const input = e.target.parentElement.parentElement.querySelector('.url-edit-input');
      saveEditedUrl(index, input.value.trim());
    } else if (e.target.classList.contains('cancel-btn')) {
      cancelEditUrl(index);
    } else if (e.target.classList.contains('url-text')) {
      startEditingUrl(index);
    }
  });
  
  // Handle duplicate allow list button clicks (event delegation)
  document.getElementById('duplicateAllowListContainer').addEventListener('click', (e) => {
    const index = parseInt(e.target.getAttribute('data-index'));
    
    if (e.target.classList.contains('duplicate-remove-btn')) {
      removeDuplicateAllowPattern(index);
    } else if (e.target.classList.contains('duplicate-edit-btn')) {
      startEditingDuplicateAllowUrl(index);
    } else if (e.target.classList.contains('duplicate-save-btn')) {
      const input = e.target.parentElement.parentElement.querySelector('.duplicate-url-edit-input');
      saveEditedDuplicateAllowUrl(index, input.value.trim());
    } else if (e.target.classList.contains('duplicate-cancel-btn')) {
      cancelEditDuplicateAllowUrl(index);
    } else if (e.target.classList.contains('duplicate-url-text')) {
      startEditingDuplicateAllowUrl(index);
    }
  });
  
  // Handle group rule list button clicks (event delegation)
  document.getElementById('groupRuleListContainer').addEventListener('click', (e) => {
    const index = parseInt(e.target.getAttribute('data-index'));
    const ruleIndex = parseInt(e.target.getAttribute('data-rule-index'));
    const patternIndex = parseInt(e.target.getAttribute('data-pattern-index'));
    
    if (e.target.classList.contains('group-rule-remove-btn')) {
      removeGroupRule(index);
    } else if (e.target.classList.contains('group-rule-edit-btn')) {
      startEditingGroupRule(index);
    } else if (e.target.classList.contains('group-rule-save-btn')) {
      saveEditedGroupRule(index);
    } else if (e.target.classList.contains('group-rule-cancel-btn')) {
      cancelEditGroupRule(index);
    } else if (e.target.classList.contains('expand-btn')) {
      togglePatterns(index);
    } else if (e.target.classList.contains('add-pattern-btn')) {
      addPattern(ruleIndex);
    } else if (e.target.classList.contains('remove-pattern-btn')) {
      removePattern(ruleIndex, patternIndex);
    }
  });
  
  // Handle Enter key in pattern inputs (event delegation)
  document.getElementById('groupRuleListContainer').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('pattern-input')) {
      const ruleIndex = parseInt(e.target.getAttribute('id').split('-')[2]);
      addPattern(ruleIndex);
    }
  });
});

// Listen for tab changes to update count in real-time
chrome.tabs.onCreated.addListener(() => {
  updateTabCount();
});

chrome.tabs.onRemoved.addListener(() => {
  updateTabCount();
});

chrome.tabs.onUpdated.addListener(() => {
  updateTabCount();
});

// Listen for tab group changes
chrome.tabGroups.onCreated.addListener(() => {
  updateTabCount();
});

chrome.tabGroups.onRemoved.addListener(() => {
  updateTabCount();
});

chrome.tabGroups.onUpdated.addListener(() => {
  updateTabCount();
});
