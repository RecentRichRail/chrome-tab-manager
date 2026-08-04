// Popup script for Chrome Tab Manager
// This script handles the popup interface interactions

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]; });
}

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
  
  if (!autoCloseSettings.urlPatterns || autoCloseSettings.urlPatterns.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 20px; color: var(--muted); border: 1px dashed var(--glass-stroke); border-radius: 8px; margin-top: 8px;">
        <svg viewBox="0 0 24 24" style="width:32px;height:32px;margin:0 auto 8px;opacity:0.5;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none;" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        <div style="font-size:14px; font-weight:600; color: var(--text-primary); margin-bottom: 4px;">No URL patterns</div>
        <div style="font-size:12px; margin-bottom: 12px;">Add one above to start automatically closing matching tabs.</div>
      </div>
    `;
    return;
  }

  // ⚡ Bolt Performance Optimization:
  // Batch DOM mutations using a DocumentFragment to prevent O(N) reflows
  // and layout thrashing when updating the URL list.
  const fragment = document.createDocumentFragment();

  autoCloseSettings.urlPatterns.forEach((pattern, index) => {
    const item = document.createElement('div');
    item.className = 'url-item';
    item.innerHTML = `
      <code class="url-text" data-index="${index}" title="Click to edit">${escapeHtml(pattern)}</code>
      <div class="url-item-buttons">
        <button class="edit-btn" data-index="${index}" title="Edit" aria-label="Edit pattern: ${escapeHtml(pattern)}">Edit</button>
        <button class="remove-btn" data-index="${index}" title="Remove" aria-label="Remove pattern: ${escapeHtml(pattern)}">Remove</button>
      </div>
    `;
    fragment.appendChild(item);
  });

  container.appendChild(fragment);
}

// Update the duplicate allow list display
function updateDuplicateAllowList() {
  const container = document.getElementById('duplicateAllowListContainer');
  container.innerHTML = '';
  
  if (!duplicatePreventionSettings.allowedDuplicatePatterns || duplicatePreventionSettings.allowedDuplicatePatterns.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 20px; color: var(--muted); border: 1px dashed var(--glass-stroke); border-radius: 8px; margin-top: 8px;">
        <svg viewBox="0 0 24 24" style="width:32px;height:32px;margin:0 auto 8px;opacity:0.5;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none;" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div style="font-size:14px; font-weight:600; color: var(--text-primary); margin-bottom: 4px;">No exceptions</div>
        <div style="font-size:12px; margin-bottom: 12px;">All URLs will be checked for duplicates.</div>
      </div>
    `;
    return;
  }

  // ⚡ Bolt Performance Optimization:
  // Batch DOM mutations using a DocumentFragment to prevent O(N) reflows
  // and layout thrashing when updating the duplicate allow list.
  const fragment = document.createDocumentFragment();

  duplicatePreventionSettings.allowedDuplicatePatterns.forEach((pattern, index) => {
    const item = document.createElement('div');
    item.className = 'url-item';
    item.innerHTML = `
      <code class="duplicate-url-text" data-index="${index}" title="Click to edit">${escapeHtml(pattern)}</code>
      <div class="url-item-buttons">
        <button class="duplicate-edit-btn" data-index="${index}" title="Edit" aria-label="Edit exception pattern: ${escapeHtml(pattern)}">Edit</button>
        <button class="duplicate-remove-btn" data-index="${index}" title="Remove" aria-label="Remove exception pattern: ${escapeHtml(pattern)}">Remove</button>
      </div>
    `;
    fragment.appendChild(item);
  });

  container.appendChild(fragment);
}

// Update the group rule list display
function updateGroupRuleList() {
  const container = document.getElementById('groupRuleListContainer');
  container.innerHTML = '';
  
  if (!autoTabGroupingSettings.tabGroupRules || autoTabGroupingSettings.tabGroupRules.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 20px; color: var(--muted); border: 1px dashed var(--glass-stroke); border-radius: 8px; margin-top: 8px;">
        <svg viewBox="0 0 24 24" style="width:32px;height:32px;margin:0 auto 8px;opacity:0.5;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none;" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        <div style="font-size:14px; font-weight:600; color: var(--text-primary); margin-bottom: 4px;">No tab group rules</div>
        <div style="font-size:12px; margin-bottom: 12px;">Create one above to start organizing tabs automatically.</div>
      </div>
    `;
    return;
  }

  // ⚡ Bolt Performance Optimization:
  // Batch DOM mutations using a DocumentFragment to prevent O(N) reflows
  // and layout thrashing when updating the group rule list.
  const fragment = document.createDocumentFragment();

  autoTabGroupingSettings.tabGroupRules.forEach((rule, index) => {
    const item = document.createElement('div');
    item.className = 'group-rule-item';
    item.setAttribute('data-index', index);
    
    // Display patterns count
    const patterns = rule.patterns || [];
    const colorDisplay = rule.groupColor ? ` (${escapeHtml(rule.groupColor)})` : ' (random)';
    
    item.innerHTML = `
      <div class="group-rule-header">
        <div class="group-rule-info">
          <div class="group-rule-name">${escapeHtml(rule.groupName)}${colorDisplay}</div>
          <div class="group-rule-pattern">${patterns.length} URL pattern${patterns.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="group-rule-buttons">
          <button class="expand-btn" data-index="${index}" aria-expanded="false" aria-controls="patterns-${index}" title="Expand URLs" aria-label="Expand URLs for group: ${escapeHtml(rule.groupName)}" data-group-name="${escapeHtml(rule.groupName)}">+</button>
          <button class="edit-btn group-rule-edit-btn" data-index="${index}" title="Edit Group" aria-label="Edit group: ${escapeHtml(rule.groupName)}">Edit</button>
          <button class="remove-btn group-rule-remove-btn" data-index="${index}" title="Remove" aria-label="Remove group: ${escapeHtml(rule.groupName)}">Remove</button>
        </div>
      </div>
      <div class="group-rule-patterns" id="patterns-${index}" style="display: none;">
        ${patterns.map((pattern, patternIndex) => `
          <div class="pattern-item">
            <span class="pattern-text">${escapeHtml(pattern)}</span>
            <button class="remove-btn remove-pattern-btn" data-rule-index="${index}" data-pattern-index="${patternIndex}" title="Remove" aria-label="Remove pattern: ${escapeHtml(pattern)}">×</button>
          </div>
        `).join('')}
        <div class="add-pattern-form">
          <input type="text" class="pattern-input" placeholder="URL pattern (e.g., *github.com*)" id="pattern-input-${index}" aria-label="URL pattern for ${escapeHtml(rule.groupName)}">
          <button class="add-pattern-btn" data-rule-index="${index}" title="Add Pattern" aria-label="Add pattern to group: ${escapeHtml(rule.groupName)}">Add</button>
        </div>
      </div>
    `;
    fragment.appendChild(item);
  });

  container.appendChild(fragment);
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
    <input type="text" class="url-edit-input" value="${escapeHtml(currentPattern)}" data-index="${index}" aria-label="Edit URL: ${escapeHtml(currentPattern)}">
    <div class="url-item-buttons">
      <button class="save-btn" data-index="${index}" title="Save" aria-label="Save URL: ${escapeHtml(currentPattern)}">Save</button>
      <button class="cancel-btn" data-index="${index}" title="Cancel" aria-label="Cancel edit URL: ${escapeHtml(currentPattern)}">Cancel</button>
    </div>
  `;
  
  // Focus and select the input
  const input = item.querySelector('.url-edit-input');
  input.focus();
  input.select();
  
  // Handle Enter key to save
  input.addEventListener('keydown', (e) => {
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
  
  if (newPattern.length > 200) {
    alert('URL pattern cannot exceed 200 characters.');
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
    <input type="text" class="duplicate-url-edit-input" value="${escapeHtml(currentPattern)}" data-index="${index}" aria-label="Edit duplicate URL: ${escapeHtml(currentPattern)}">
    <div class="url-item-buttons">
      <button class="duplicate-save-btn" data-index="${index}" title="Save" aria-label="Save duplicate URL: ${escapeHtml(currentPattern)}">Save</button>
      <button class="duplicate-cancel-btn" data-index="${index}" title="Cancel" aria-label="Cancel edit duplicate URL: ${escapeHtml(currentPattern)}">Cancel</button>
    </div>
  `;
  
  // Focus and select the input
  const input = item.querySelector('.duplicate-url-edit-input');
  input.focus();
  input.select();
  
  // Handle Enter key to save
  input.addEventListener('keydown', (e) => {
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
  
  if (newPattern.length > 200) {
    alert('Exception pattern cannot exceed 200 characters.');
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
  
  if (groupName.length > 50) {
    alert('Group name cannot exceed 50 characters.');
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
  
  if (pattern.length > 200) {
    alert('URL pattern cannot exceed 200 characters.');
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
    button.title = 'Collapse URLs';
    button.setAttribute('aria-label', `Collapse URLs for group: ${button.dataset.groupName}`);
    button.setAttribute('aria-expanded', 'true');
  } else {
    patternsDiv.style.display = 'none';
    item.classList.remove('group-rule-expanded');
    button.textContent = '+';
    button.title = 'Expand URLs';
    button.setAttribute('aria-label', `Expand URLs for group: ${button.dataset.groupName}`);
    button.setAttribute('aria-expanded', 'false');
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
        <input type="text" class="form-input group-rule-name-edit" value="${escapeHtml(rule.groupName)}" data-index="${index}" aria-label="Group rule name">
      </div>
      <div class="form-row">
        <span class="form-label">Color:</span>
        <select class="color-select group-rule-color-edit" data-index="${index}" aria-label="Group rule color">
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
        <button class="save-btn group-rule-save-btn" data-index="${index}" title="Save" aria-label="Save group rule: ${escapeHtml(rule.groupName)}">Save</button>
        <button class="cancel-btn group-rule-cancel-btn" data-index="${index}" title="Cancel" aria-label="Cancel edit group rule: ${escapeHtml(rule.groupName)}">Cancel</button>
      </div>
    </div>
  `;
  
  // Focus the name input
  const nameInput = item.querySelector('.group-rule-name-edit');
  nameInput.focus();
  nameInput.select();

  // Handle Enter key to save, Escape to cancel
  const editForm = item.querySelector('.group-rule-edit-form');
  if (editForm) {
    editForm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveEditedGroupRule(index);
      } else if (e.key === 'Escape') {
        cancelEditGroupRule(index);
      }
    });
  }
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
  
  if (groupName.length > 50) {
    alert('Group name cannot exceed 50 characters.');
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
  
  if (pattern) {
    if (pattern.length > 200) {
      alert('URL pattern cannot exceed 200 characters.');
      return;
    }
    if (!autoCloseSettings.urlPatterns.includes(pattern)) {
      autoCloseSettings.urlPatterns.push(pattern);
      input.value = '';
      updateUrlList();
      saveAutoCloseSettings();
    }
  }
}

// Add duplicate allow pattern
function addDuplicateAllowPattern() {
  const input = document.getElementById('duplicateAllowInput');
  const pattern = input.value.trim();
  
  if (pattern) {
    if (pattern.length > 200) {
      alert('Exception pattern cannot exceed 200 characters.');
      return;
    }
    if (!duplicatePreventionSettings.allowedDuplicatePatterns.includes(pattern)) {
      duplicatePreventionSettings.allowedDuplicatePatterns.push(pattern);
      input.value = '';
      updateDuplicateAllowList();
      saveDuplicatePreventionSettings();
    }
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
    header.setAttribute('aria-expanded', 'false');
  } else {
    content.classList.add('expanded');
    arrow.classList.add('expanded');
    header.setAttribute('aria-expanded', 'true');
  }
}

// Setup menu toggle event listeners (click and enter/space to toggle)
function setupMenuToggle(headerId, contentId) {
  const header = document.getElementById(headerId);
  if (header) {
    header.addEventListener('click', () => toggleMenu(headerId, contentId));
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMenu(headerId, contentId);
      }
    });
  }
}

let tabCountUpdateTimeout = null;

// Function to get and display the current tab count and group info
async function updateTabCount() {
  try {
    // ⚡ Bolt Performance Optimization:
    // Parallelize independent data fetches (total tabs and active tab) to minimize sequential IPC latency.
    const [tabs, activeTabs] = await Promise.all([
      chrome.tabs.query({}),
      chrome.tabs.query({ active: true, currentWindow: true })
    ]);
    const tabCount = tabs.length;
    
    const tabCountElement = document.getElementById('tabCount');
    tabCountElement.textContent = tabCount;
    
    // Get tab groups information
    const activeTab = activeTabs[0];
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
  const btn = document.getElementById('expandAllBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Expanding...';
  }
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;
    
    const tabGroups = await chrome.tabGroups.query({ windowId: activeTab.windowId });
    const tasks = [];
    
    for (const group of tabGroups) {
      if (group.collapsed) {
        tasks.push(chrome.tabGroups.update(group.id, { collapsed: false }));
      }
    }
    
    await Promise.allSettled(tasks);

    console.log(`Expanded ${tabGroups.length} tab groups`);
    updateTabCount();
    if (btn) btn.textContent = 'Expanded!';
  } catch (error) {
    console.error('Error expanding groups:', error);
    if (btn) btn.textContent = 'Error';
  } finally {
    if (btn) {
      setTimeout(() => {
        btn.textContent = 'Expand All Groups';
        btn.disabled = false;
      }, 1500);
    }
  }
}

// Function to collapse all tab groups except the active one
async function collapseAllGroups() {
  const btn = document.getElementById('collapseAllBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Collapsing...';
  }
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;
    
    const tabGroups = await chrome.tabGroups.query({ windowId: activeTab.windowId });
    const activeGroupId = activeTab.groupId;
    const tasks = [];
    
    for (const group of tabGroups) {
      // Don't collapse the group containing the active tab
      if (group.id !== activeGroupId && !group.collapsed) {
        tasks.push(chrome.tabGroups.update(group.id, { collapsed: true }));
      }
    }
    
    await Promise.allSettled(tasks);

    console.log('Collapsed all inactive tab groups');
    updateTabCount();
    if (btn) btn.textContent = 'Collapsed!';
  } catch (error) {
    console.error('Error collapsing groups:', error);
    if (btn) btn.textContent = 'Error';
  } finally {
    if (btn) {
      setTimeout(() => {
        btn.textContent = 'Collapse All Groups';
        btn.disabled = false;
      }, 1500);
    }
  }
}

// Function to regroup all tabs based on current rules
async function regroupAllTabs() {
  const btn = document.getElementById('regroupAllBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Regrouping...';
  }
  try {
    console.log('Regrouping all tabs based on current rules...');
    
    // Send message to background script to regroup all tabs
    const response = await chrome.runtime.sendMessage({ action: 'groupExistingTabs' });
    
    if (response && response.success) {
      console.log('Successfully regrouped all tabs');
      // Update the tab count and group info
      setTimeout(updateTabCount, 500);
      if (btn) btn.textContent = 'Regrouped!';
    } else {
      console.error('Failed to regroup tabs:', response?.error);
      if (btn) btn.textContent = 'Error';
    }
  } catch (error) {
    console.error('Error regrouping tabs:', error);
    if (btn) btn.textContent = 'Error';
  } finally {
    if (btn) {
      setTimeout(() => {
        btn.textContent = 'Regroup All Tabs';
        btn.disabled = false;
      }, 1500);
    }
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

      // 🛡️ Sentinel: Enforce length limit to prevent storage DoS
      if (label.length > 50) {
        alert('Window label cannot exceed 50 characters.');
        return;
      }

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

        // 🛡️ Sentinel: Enforce length limit to prevent storage DoS
        if (label.length > 50) {
          alert('Window label cannot exceed 50 characters.');
          return;
        }

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

    // 🛡️ Sentinel: Enforce file size limit (1MB) to prevent OOM/DoS
    const MAX_FILE_SIZE = 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert('File is too large. Maximum size is 1MB.');
      // clear the input so the same file can be selected again if needed after it's fixed
      importFileInput.value = '';
      return;
    }

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

      // 🛡️ Sentinel: Sanitize imported arrays to prevent Logic DoS (Type Confusion)
      if (settingsToImport.urlPatterns) {
        if (!Array.isArray(settingsToImport.urlPatterns)) settingsToImport.urlPatterns = [];
        settingsToImport.urlPatterns = settingsToImport.urlPatterns
          .filter(p => typeof p === 'string' && p.length <= 200)
          .slice(0, 1000);
      }
      if (settingsToImport.allowedDuplicatePatterns) {
        if (!Array.isArray(settingsToImport.allowedDuplicatePatterns)) settingsToImport.allowedDuplicatePatterns = [];
        settingsToImport.allowedDuplicatePatterns = settingsToImport.allowedDuplicatePatterns
          .filter(p => typeof p === 'string' && p.length <= 200)
          .slice(0, 1000);
      }
      if (settingsToImport.tabGroupRules) {
        if (!Array.isArray(settingsToImport.tabGroupRules)) settingsToImport.tabGroupRules = [];
        settingsToImport.tabGroupRules = settingsToImport.tabGroupRules
          .filter(r => r && typeof r === 'object')
          .map(r => ({
            groupName: typeof r.groupName === 'string' ? r.groupName.slice(0, 50) : 'Imported Group',
            groupColor: typeof r.groupColor === 'string' ? r.groupColor : undefined,
            patterns: Array.isArray(r.patterns) ? r.patterns.filter(p => typeof p === 'string' && p.length <= 200).slice(0, 500) : []
          }))
          .slice(0, 100);
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
        openSettingsBtn.setAttribute('title', 'Back to Explorer');
        openSettingsBtn.setAttribute('aria-label', 'Back to Explorer');
      } else {
        settingsRoot.style.display = 'none';
        explorerRoot.style.display = 'block';
        // Switch back to gear icon
        if (settingsIcon) settingsIcon.innerHTML = '<path d="M19.43 12.98c.04-.32.07-.66.07-1s-.03-.68-.07-1l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.03 7.03 0 0 0-1.73-1l-.38-2.65A.5.5 0 0 0 13 2h-4a.5.5 0 0 0-.5.42l-.38 2.65a7.03 7.03 0 0 0-1.73 1l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0-.12.64L4.57 10c-.04.32-.07.66-.07 1s.03.68.07 1l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.69.22l2.49-1c.53.42 1.11.77 1.73 1l.38 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.38-2.65c.62-.23 1.2-.58 1.73-1l2.49 1c.26.12.55.02.69-.22l2-3.46a.5.5 0 0 0-.12-.64L19.43 12.98zM11 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />';
        if (headerTitle) headerTitle.textContent = 'Tab Explorer';
        openSettingsBtn.setAttribute('title', 'Settings');
        openSettingsBtn.setAttribute('aria-label', 'Settings');
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

  // ⚡ Bolt Performance Optimization:
  // Debounce the search input to prevent rapid, unnecessary DOM rebuilds
  // and async calls to chrome.windows.getAll on every keystroke.
  let searchTimeoutId = null;
  const searchInput = document.getElementById('windowSearchInput');
  searchInput.addEventListener('input', (e) => {
    if (searchTimeoutId) clearTimeout(searchTimeoutId);
    searchTimeoutId = setTimeout(() => {
      // Rebuild to support the alternate grouped-by-title layout when filtering
      buildWindowExplorer();
    }, 250);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      searchInput.value = '';
      const filterSelect = document.getElementById('windowFilterSelect');
      if (filterSelect) filterSelect.value = 'all';
      buildWindowExplorer();
    }
  });

  // Global keydown for search shortcut
  document.addEventListener('keydown', (e) => {
    // Only trigger if not already typing in an input, textarea, or select
    if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
      e.preventDefault();
      const inputEl = document.getElementById('windowSearchInput');
      if (inputEl) inputEl.focus();
    }
  });

  // Build explorer on open by default
  buildWindowExplorer();

  async function buildWindowExplorer() {
    const container = document.getElementById('windowListContainer');
    container.innerHTML = '';
    let a11yIdCounter = 0;
    try {
      // ⚡ Bolt Performance Optimization:
      // Parallelize independent data fetches (windows, groups, labels, auto-close settings)
      // into a single Promise.all() rather than sequential awaits to minimize IPC blocking overhead.
      const [windows, allGroupsList, labelsMsg, ac] = await Promise.all([
        chrome.windows.getAll({ populate: true }),
        chrome.tabGroups.query({}),
        new Promise(resolve => chrome.runtime.sendMessage({ type: 'getAllWindowLabels' }, resolve)),
        chrome.storage.sync.get({ autoCloseEnabled: false, urlPatterns: [] })
      ]);
      const groupMap = new Map(allGroupsList.map(g => [String(g.id), g]));

      const labels = labelsMsg || {};
      const labelMap = labels.labels ? labels.labels : {};
      const filterMode = (document.getElementById('windowFilterSelect')?.value) || 'all';
      const sortMode = (document.getElementById('windowSortSelect')?.value) || 'title-asc';

      // Helper: escape a string for use in RegExp
      const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const labelRegexCache = new Map();

      // Helper: strip a window label prefix like "[Label] " from a title, but only
      // if it matches the known label for that window. This avoids stripping
      // legitimate bracketed prefixes in real page titles.
      const stripWindowLabel = (title, windowId) => {
        const lbl = labelMap[String(windowId)];
        if (!lbl) return title || '(no title)';
        try {
          let re = labelRegexCache.get(lbl);
          if (!re) {
            re = new RegExp('^\\[' + escapeRegExp(lbl) + '\\]\\s*');
            labelRegexCache.set(lbl, re);
          }
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
          const title = t.title || '(no title)';
          const url = t.url || '';
          allTabs.push({
            windowId: w.id,
            groupId: t.groupId,
            tabId: t.id,
            title: title,
            url: url,
            lowerTitle: title.toLowerCase(),
            lowerUrl: url.toLowerCase(),
            lastAccessed: t.lastAccessed || 0
          });
        }
      }

      // Helper: normalize URL for duplicate detection (match background.js)
      const normalizeUrl = (url) => {
        return typeof url === 'string' ? url.split('#')[0] : url;
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
        const patterns = ac.urlPatterns || [];

        // ⚡ Bolt Performance Optimization:
        // Pre-parse and lower-case patterns once outside the filter loop
        // to prevent O(N * M) redundant string allocations where N = tabs, M = patterns.
        const parsedPatterns = patterns.map(pattern => {
          if (!pattern || pattern.length > 200) return null;
          const parts = pattern.split('*');
          return {
            exact: parts.length === 1,
            lowerPattern: parts.length === 1 ? pattern.toLowerCase() : null,
            lowerParts: parts.length > 1 ? parts.map(p => p.toLowerCase()) : []
          };
        }).filter(Boolean);
        // Helper for safe pattern matching (ReDoS prevention) using pre-parsed parts
        const matchesParsedPattern = (url, lowerUrl, parsed) => {
          if (!url || url.length > 2000) return false;
          if (!url || url.length > 2000) return false;

          if (parsed.exact) return lowerUrl === parsed.lowerPattern;

          const lowerParts = parsed.lowerParts;
          if (!lowerUrl.startsWith(lowerParts[0])) return false;

          let currentIndex = lowerParts[0].length;
          for (let i = 1; i < lowerParts.length - 1; i++) {
            const part = lowerParts[i];
            if (part === '') continue;
            const foundIndex = lowerUrl.indexOf(part, currentIndex);
            if (foundIndex === -1) return false;
            currentIndex = foundIndex + part.length;
          }

          const lastPart = lowerParts[lowerParts.length - 1];
          if (lastPart !== '') {
            if (!lowerUrl.endsWith(lastPart)) return false;
            if (lowerUrl.length - lastPart.length < currentIndex) return false;
          }
          return true;
        };

        filteredTabs = allTabs.filter(t => {
          if (!t.url || t.url.length > 2000) return false;
          const lowerUrl = t.lowerUrl;
          return parsedPatterns.some(parsed => matchesParsedPattern(t.url, lowerUrl, parsed));
        });
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
        const lTitle = tab.lowerTitle !== undefined ? tab.lowerTitle : (tab.title || '').toLowerCase();
        const lUrl = tab.lowerUrl !== undefined ? tab.lowerUrl : (tab.url || '').toLowerCase();
        return lTitle.includes(searchQ) || lUrl.includes(searchQ);
      };

      const hasVisibleTabs = filteredTabs.some(searchFilter);
      if (!hasVisibleTabs) {
        container.innerHTML = `
          <div style="text-align:center; padding: 40px 20px; color: var(--muted);">
            <svg viewBox="0 0 24 24" style="width:48px;height:48px;margin:0 auto 12px;opacity:0.5;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none;" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div style="font-size:15px; font-weight:600; color: var(--text-primary); margin-bottom: 4px;">No tabs found</div>
            <div style="font-size:13px; margin-bottom: 16px;">Try adjusting your search or filters.</div>
            <button id="clearSearchFiltersBtn" class="btn-glass">Clear Search & Filters</button>
          </div>
        `;
        const clearBtn = container.querySelector('#clearSearchFiltersBtn');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            const searchInputEl = document.getElementById('windowSearchInput');
            if (searchInputEl) searchInputEl.value = '';
            const filterSelectEl = document.getElementById('windowFilterSelect');
            if (filterSelectEl) filterSelectEl.value = 'all';
            buildWindowExplorer();
          });
        }
        return;
      }

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

        // ⚡ Bolt Performance Optimization:
        // Use a DocumentFragment to batch the insertion of titleDivs.
        // Appending elements to the live DOM (container) inside the loop triggers O(N) reflows.
        const titleGridFragment = document.createDocumentFragment();

        // Sort titles alphabetically by base title for stable display
        const sortedEntries = Array.from(byTitle.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [title, winMap] of sortedEntries) {
          const titleDiv = document.createElement('div');
          titleDiv.className = 'menu-section explorer-title';
          const headerEl = document.createElement('div');
          headerEl.className = 'menu-header';
          const contentId = `explorer-content-${++a11yIdCounter}`;
          headerEl.setAttribute('role', 'button');
          headerEl.setAttribute('tabindex', '0');
          headerEl.setAttribute('aria-controls', contentId);
          // Count total tabs under this title across windows/groups
          let totalCount = 0;
          for (const m of winMap.values()) { for (const tabs of m.values()) totalCount += tabs.length; }
          headerEl.innerHTML = `<span>${escapeHtml(title)}</span><span class="count-badge">${totalCount}</span><span class="menu-arrow">▶</span>`;
          const contentEl = document.createElement('div');
          contentEl.id = contentId;
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
            const wContentId = `explorer-wcontent-${++a11yIdCounter}`;
            wHeader.setAttribute('role', 'button');
            wHeader.setAttribute('tabindex', '0');
            wHeader.setAttribute('aria-controls', wContentId);
            wHeader.innerHTML = `<span>${escapeHtml(headerTitle)}</span><span class="menu-arrow">▶</span>`;
            const wContent = document.createElement('div');
            wContent.id = wContentId;
            wContent.className = 'menu-content';
            wContent.style.display = 'none';

            const groupsContainer = document.createElement('div');
            groupsContainer.style.padding = '8px';
            groupsContainer.innerHTML = `<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Groups & Tabs</div>`;

            for (const [gid, tabs] of grpMap.entries()) {
              const groupContainer = document.createElement('div');
              groupContainer.className = 'group-rule-item explorer-group';
              let groupTitle = 'Ungrouped';
              if (gid !== 'ungrouped') {
                try {
                  const tg = groupMap.get(String(gid));
                  groupTitle = tg && tg.title ? tg.title : `Group ${gid}`;
                } catch { groupTitle = `Group ${gid}`; }
              }
              const gHeader = document.createElement('div');
              gHeader.className = 'group-rule-header explorer-group-header';
              const gContentId = `explorer-gcontent-${++a11yIdCounter}`;
              gHeader.setAttribute('role', 'button');
              gHeader.setAttribute('tabindex', '0');
              gHeader.setAttribute('aria-controls', gContentId);
              gHeader.innerHTML = `<div class="group-rule-name">${escapeHtml(groupTitle)}</div><span class="menu-arrow">▶</span>`;
              const gContent = document.createElement('div');
              gContent.id = gContentId;
              gContent.className = 'explorer-group-content';
              gContent.style.display = 'none';

              for (const tab of tabs) {
                const baseTitle = stripWindowLabel(tab.title, tab.windowId);
                const tEl = document.createElement('div');
                tEl.className = 'url-item explorer-tab-item';
                tEl.style.margin = '6px 0';
                tEl.setAttribute('role', 'button');
                tEl.setAttribute('tabindex', '0');
                tEl.dataset.title = String(tab.title || '(no title)');
                tEl.dataset.url = String(tab.url || '');
                tEl.dataset.lowertitle = tab.lowerTitle;
                tEl.dataset.lowerurl = tab.lowerUrl;
                tEl.dataset.tabid = String(tab.tabId);
                tEl.dataset.windowid = String(tab.windowId);
                tEl.dataset.groupid = String(gid === 'ungrouped' ? '-1' : gid);
                tEl.innerHTML = `
                  <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
                    <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(baseTitle)}">${escapeHtml(baseTitle)}</div>
                    <div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;" title="${escapeHtml(tab.url || '')}">${escapeHtml(tab.url || '')}</div>
                  </div>
                  <div style="margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;">
                    <button class="close-tab-btn" title="Close tab" aria-label="Close tab: ${escapeHtml(baseTitle)}" data-tabid="${tab.tabId}">✕</button>
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
            const toggleWindow = () => {
              const expand = wContent.style.display === 'none';
              wContent.style.display = expand ? 'block' : 'none';
              wHeader.setAttribute('aria-expanded', expand.toString());
              const arrow = wHeader.querySelector('.menu-arrow');
              if (arrow) arrow.classList.toggle('expanded', expand);
            };
            wHeader.addEventListener('click', toggleWindow);
            wHeader.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleWindow();
              }
            });
            // Initial ARIA state
            wHeader.setAttribute('aria-expanded', 'false');
          }

          titleGridFragment.appendChild(titleDiv);
          titleDiv.appendChild(headerEl);
          titleDiv.appendChild(contentEl);
          const toggleTitle = () => {
            const expand = contentEl.style.display === 'none';
            contentEl.style.display = expand ? 'block' : 'none';
            headerEl.setAttribute('aria-expanded', expand.toString());
            const arrow = headerEl.querySelector('.menu-arrow');
            if (arrow) arrow.classList.toggle('expanded', expand);
          };
          headerEl.addEventListener('click', toggleTitle);
          headerEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleTitle();
            }
          });
          // Initial ARIA state
          headerEl.setAttribute('aria-expanded', 'false');

          // Wire group toggles inside titles
          contentEl.querySelectorAll('.explorer-group-header').forEach(h => {
            const toggleGroup = () => {
              const gc = h.parentElement.querySelector('.explorer-group-content');
              if (gc) {
                const expand = gc.style.display === 'none';
                gc.style.display = expand ? 'block' : 'none';
                h.setAttribute('aria-expanded', expand.toString());
                const arrow = h.querySelector('.menu-arrow');
                if (arrow) arrow.classList.toggle('expanded', expand);
              }
            };
            h.addEventListener('click', toggleGroup);
            h.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleGroup();
              }
            });
            h.setAttribute('aria-expanded', 'false');
          });
        }

        // Append the fully constructed fragment to the grid, and grid to container
        titleGrid.appendChild(titleGridFragment);
        container.appendChild(titleGrid);
      } else {
        // Original layout by window -> group -> tabs

        // ⚡ Bolt Performance Optimization:
        // Use a DocumentFragment to batch the insertion of windows.
        // Appending elements to the live DOM (container) inside the loop triggers O(N) reflows.
        const windowFragment = document.createDocumentFragment();

        for (const w of windows) {
          const winDiv = document.createElement('div');
          winDiv.className = 'menu-section explorer-window';
          const winLabel = labelMap[String(w.id)] || '';
          const headerTitle = winLabel ? `${winLabel}` : `Window ${w.id}`;
          const headerEl = document.createElement('div');
          headerEl.className = 'menu-header';
          const contentId = `explorer-window-content-${++a11yIdCounter}`;
          headerEl.setAttribute('role', 'button');
          headerEl.setAttribute('tabindex', '0');
          headerEl.setAttribute('aria-controls', contentId);
          headerEl.innerHTML = `<span>${escapeHtml(headerTitle)}</span><span class=\"menu-arrow\">▶</span>`;
          const contentEl = document.createElement('div');
          contentEl.id = contentId;
          contentEl.className = 'menu-content';
          contentEl.style.display = 'none';
          contentEl.innerHTML = `
              <div style=\"padding:8px;\">
                <div style=\"font-size:12px;color:var(--muted);margin-bottom:6px;\">Groups & Tabs</div>
                <div id=\"window-${w.id}-groups\"></div>
              </div>
          `;
          winDiv.appendChild(headerEl);
          winDiv.appendChild(contentEl);
          windowFragment.appendChild(winDiv);

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
                const tg = groupMap.get(String(gid));
                groupTitle = tg && tg.title ? tg.title : `Group ${gid}`;
              } catch { groupTitle = `Group ${gid}`; }
            }
            const groupHeader = document.createElement('div');
            groupHeader.className = 'group-rule-header explorer-group-header';
            const groupContentId = `explorer-group-content-${++a11yIdCounter}`;
            groupHeader.setAttribute('role', 'button');
            groupHeader.setAttribute('tabindex', '0');
            groupHeader.setAttribute('aria-controls', groupContentId);
            groupHeader.innerHTML = `<div class=\"group-rule-name\">${escapeHtml(groupTitle)}</div><span class=\"menu-arrow\">▶</span>`;
            const groupContent = document.createElement('div');
            groupContent.id = groupContentId;
            groupContent.className = 'explorer-group-content';
            groupContent.style.display = 'none';

            for (const tab of tabs) {
              if (!searchFilter({ title: tab.title, url: tab.url })) continue;
              const titleStr = String(tab.title || '(no title)');
              const urlStr = String(tab.url || '');
              const tEl = document.createElement('div');
              tEl.className = 'url-item explorer-tab-item';
              tEl.style.margin = '6px 0';
              tEl.setAttribute('role', 'button');
              tEl.setAttribute('tabindex', '0');
              tEl.dataset.title = titleStr;
              tEl.dataset.url = urlStr;
              tEl.dataset.lowertitle = tab.lowerTitle !== undefined ? tab.lowerTitle : titleStr.toLowerCase();
              tEl.dataset.lowerurl = tab.lowerUrl !== undefined ? tab.lowerUrl : urlStr.toLowerCase();
              tEl.dataset.tabid = String(tab.id);
              tEl.dataset.windowid = String(w.id);
              tEl.dataset.groupid = String(gid === 'ungrouped' ? '-1' : gid);
              tEl.innerHTML = `
                <div style=\"flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;\">\
                  <div style=\"font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\" title=\"${escapeHtml(tab.title || '(no title)')}\">${escapeHtml(tab.title || '(no title)')}</div>\
                  <div style=\"font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;\" title=\"${escapeHtml(tab.url || '')}\">${escapeHtml(tab.url || '')}</div>\
                </div>
                <div style=\"margin-left:8px;flex-shrink:0;display:flex;align-items:center;gap:6px;\">\
                  <button class=\"close-tab-btn\" title=\"Close tab\" aria-label=\"Close tab: ${escapeHtml(tab.title || '(no title)')}\" data-tabid=\"${tab.id}\">✕</button>\
                </div>
              `;
              groupContent.appendChild(tEl);
            }

            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(groupContent);
            groupsContainer.appendChild(groupContainer);
          }

          const toggleWindowStatic = () => {
            const expand = contentEl.style.display === 'none';
            contentEl.style.display = expand ? 'block' : 'none';
            headerEl.setAttribute('aria-expanded', expand.toString());
            const arrow = headerEl.querySelector('.menu-arrow');
            if (arrow) arrow.classList.toggle('expanded', expand);
          };
          headerEl.addEventListener('click', toggleWindowStatic);
          headerEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleWindowStatic();
            }
          });
          headerEl.setAttribute('aria-expanded', 'false');
          groupsContainer.querySelectorAll('.explorer-group-header').forEach(h => {
            const toggleStaticGroup = () => {
              const gc = h.parentElement.querySelector('.explorer-group-content');
              if (gc) {
                const expand = gc.style.display === 'none';
                gc.style.display = expand ? 'block' : 'none';
                h.setAttribute('aria-expanded', expand.toString());
                const arrow = h.querySelector('.menu-arrow');
                if (arrow) arrow.classList.toggle('expanded', expand);
              }
            };
            h.addEventListener('click', toggleStaticGroup);
            h.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleStaticGroup();
              }
            });
            h.setAttribute('aria-expanded', 'false');
          });
        }

        // Append the fully constructed fragment to the container
        container.appendChild(windowFragment);
      }

      // wire up tab click and keydown to activate
      container.querySelectorAll('.explorer-tab-item').forEach(item => {
        const activateTab = async (e) => {
          // Ignore interactions on the close button
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
        };

        item.addEventListener('click', activateTab);
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activateTab(e);
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
      const emptyStateEl = container.querySelector('.empty-search-state');
      if (emptyStateEl) emptyStateEl.style.display = 'none';

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
    let anyMatchFound = false;
    windows.forEach(w => {
      let windowHasMatch = false;
      const groups = Array.from(w.querySelectorAll('.explorer-group'));
      groups.forEach(g => {
        let groupHasMatch = false;
        const tabs = Array.from(g.querySelectorAll('.explorer-tab-item'));
        tabs.forEach(t => {
          const lowerTitle = t.dataset.lowertitle || '';
          const lowerUrl = t.dataset.lowerurl || '';
          const match = lowerTitle.includes(query) || lowerUrl.includes(query);
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
      if (windowHasMatch) anyMatchFound = true;
    });

    let emptyStateEl = container.querySelector('.empty-search-state');
    if (!anyMatchFound) {
      if (!emptyStateEl) {
        emptyStateEl = document.createElement('div');
        emptyStateEl.className = 'empty-search-state';
        emptyStateEl.innerHTML = `
          <div style="text-align:center; padding: 40px 20px; color: var(--muted);">
            <svg viewBox="0 0 24 24" style="width:48px;height:48px;margin:0 auto 12px;opacity:0.5;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none;" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div style="font-size:15px; font-weight:600; color: var(--text-primary); margin-bottom: 4px;">No tabs found</div>
            <div style="font-size:13px; margin-bottom: 16px;">Try adjusting your search or filters.</div>
            <button id="clearSearchFiltersBtnFilter" class="btn-glass">Clear Search & Filters</button>
          </div>
        `;
        container.appendChild(emptyStateEl);
        const clearBtn = emptyStateEl.querySelector('#clearSearchFiltersBtnFilter');
        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            const searchInputEl = document.getElementById('windowSearchInput');
            if (searchInputEl) {
              searchInputEl.value = '';
              // Trigger input event to re-filter
              searchInputEl.dispatchEvent(new Event('input'));
            }
            const filterSelectEl = document.getElementById('windowFilterSelect');
            if (filterSelectEl) {
              filterSelectEl.value = 'all';
              // Trigger change event to re-filter
              filterSelectEl.dispatchEvent(new Event('change'));
            }
          });
        }
      }
      emptyStateEl.style.display = 'block';
    } else {
      if (emptyStateEl) emptyStateEl.style.display = 'none';
    }
  }

  
  // Add group management event listeners
  document.getElementById('expandAllBtn').addEventListener('click', expandAllGroups);
  document.getElementById('collapseAllBtn').addEventListener('click', collapseAllGroups);
  
  // Initialize static header ARIA states
  ['windowNameHeader', 'autoCollapseHeader', 'autoCloseHeader', 'autoTabGroupingHeader', 'duplicatePreventionHeader', 'importExportHeader'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-expanded', 'false');
  });

  // Setup auto-collapse menu
  setupMenuToggle('autoCollapseHeader', 'autoCollapseContent');

  // Setup Collapsible: Window Name and Import/Export sections
  setupMenuToggle('windowNameHeader', 'windowNameContent');
  setupMenuToggle('importExportHeader', 'importExportContent');
  
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
  
  // Setup auto-close menu
  setupMenuToggle('autoCloseHeader', 'autoCloseContent');
  
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
  
  document.getElementById('urlInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addUrlPattern();
    }
  });
  
  // Setup duplicate prevention menu
  setupMenuToggle('duplicatePreventionHeader', 'duplicatePreventionContent');
  
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
  
  document.getElementById('duplicateAllowInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addDuplicateAllowPattern();
    }
  });
  
  // Setup auto tab grouping menu
  setupMenuToggle('autoTabGroupingHeader', 'autoTabGroupingContent');
  
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
  
  document.getElementById('groupRuleNameInput').addEventListener('keydown', (e) => {
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
  document.getElementById('groupRuleListContainer').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('pattern-input')) {
      const ruleIndex = parseInt(e.target.getAttribute('id').split('-')[2]);
      addPattern(ruleIndex);
    }
  });
});

// ⚡ Bolt Performance Optimization:
// Debounce the updateTabCount function to prevent UI freezing and
// excessive IPC overhead during rapid tab lifecycle events (e.g., onUpdated).
function debouncedUpdateTabCount() {
  if (tabCountUpdateTimeout) {
    clearTimeout(tabCountUpdateTimeout);
  }
  tabCountUpdateTimeout = setTimeout(() => {
    updateTabCount();
  }, 250);
}

// Listen for tab changes to update count in real-time
chrome.tabs.onCreated.addListener(() => {
  debouncedUpdateTabCount();
});

chrome.tabs.onRemoved.addListener(() => {
  debouncedUpdateTabCount();
});

chrome.tabs.onUpdated.addListener(() => {
  debouncedUpdateTabCount();
});

// Listen for tab group changes
chrome.tabGroups.onCreated.addListener(() => {
  debouncedUpdateTabCount();
});

chrome.tabGroups.onRemoved.addListener(() => {
  debouncedUpdateTabCount();
});

chrome.tabGroups.onUpdated.addListener(() => {
  debouncedUpdateTabCount();
});
