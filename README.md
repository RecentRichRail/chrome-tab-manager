# Chrome Tab Manager Extension

A Chrome extension with a modern glass UI that helps you organize tabs: view windows, groups, and pages at a glance; search, filter, and sort; auto-group, auto-close, and prevent duplicates.

## Features

- **Badge Count**: Shows the number of open tabs as a badge on the extension icon
- **Real-time Updates**: Badge count updates automatically when tabs are opened, closed, or modified
- **Auto-Close Tab Groups**: Automatically collapses inactive tab groups when you switch to a different group
- **Auto Tab Grouping**: Automatically groups tabs based on URL patterns with customizable rules
- **Auto-Close Pages**: Automatically closes specified pages after a configurable delay
- **Duplicate Tab Prevention**: Prevents opening duplicate tabs and saves system resources
- **Wildcard URL Matching**: Support for wildcard patterns to match dynamic URLs
- **Popup Interface**: Glassmorphism “Tab Explorer” shows windows, groups, and pages; search under the header, filter and sort in the toolbar
   - Visuals: Liquid glass styling with glossy cards and a soft animated backdrop (disabled automatically for reduced-motion preference); popup uses a flex layout so the content area scrolls fully, ensuring bottom sections like Import/Export are reachable
- **Click-to-Go & Close**: Click any page item to activate it; use the red ✕ on the right to close it instantly
- **Tab Management**: Close all tabs except the current one (with confirmation)
- **Group Management**: Expand or collapse all tab groups manually

- **Window Labels**: Assign human-friendly names to Chrome windows. The extension prefixes tab titles in a window with the chosen label so the OS window title reflects it when that tab is active (e.g., [Work] Inbox). The badge updates immediately after saving a window name.
 - **Pop-out Explorer**: Open a resizable Explorer window that persists its size; the pop-out control hides in standalone mode.
- **Attention Badge (per window)**: The badge shows a red “!” on the active tab of the current (last-focused) window when that window is unnamed. Other windows/tabs show the global tab count. After naming the window, the badge switches to the count right away.

## Duplicate Tab Prevention

- **Smart Detection**: Monitors all open tabs and detects when duplicate URLs are opened
- **Configurable Action**: Choose to close either the newer tab or the older tab when duplicates are found
- **Exception Patterns**: Define URL patterns that are allowed to have multiple tabs open
- **Resource Saving**: Prevents unnecessary duplicate tabs that consume memory and CPU
- **Automatic Management**: Works seamlessly in the background without user intervention
- **Pattern Examples for Exceptions**:
  - `*github.com*` - Allow multiple GitHub pages
  - `*google.com/document*` - Allow multiple Google Docs
  - `https://localhost*` - Allow multiple local development servers

## Auto-Close Pages

- **Smart URL Matching**: Uses wildcard patterns (*) to match dynamic URLs
- **Configurable Delay**: Set custom delay (1-300 seconds) before closing pages (default: 15 seconds)
- **Enable/Disable Toggle**: Easy on/off control for the auto-close feature
- **Edit/Delete Patterns**: Click any URL pattern to edit it, or use the Edit/Remove buttons
- **Pattern Examples**:
  - `*login*` - Matches any URL containing "login"
  - `https://accounts.google.com*` - Matches all Google accounts pages
  - `*redirect*` - Matches URLs with "redirect" anywhere
  - `https://example.com/auth/*` - Matches specific auth paths

## Auto-Collapse Behavior

- **Smart Detection**: Monitors which tab group you're actively using
- **Delayed Collapse**: Waits 3 seconds after switching groups before collapsing inactive ones
- **Activity Tracking**: Considers recent tab activity (within 5 seconds) before collapsing
- **Active Group Protection**: Never collapses the group containing your current tab
- **Auto-Expand**: Automatically expands collapsed groups when you switch to them

## Auto Tab Grouping

- **Smart URL Matching**: Uses wildcard patterns (*) to automatically group tabs based on their URLs
- **Multiple Pattern Support**: Create rules with multiple URL patterns for a single group (comma-separated)
- **Customizable Rules**: Create multiple grouping rules with custom patterns, group names, and colors
- **Random Colors**: Choose "Random" color option for automatic color assignment to new groups
- **Flexible Settings**: Control whether to apply rules to already grouped tabs and pinned tabs
- **Auto-Close Single Groups**: Automatically ungroups tabs when a group has only one tab remaining
- **Position Control**: Choose to add new tabs to the beginning or end of existing groups
- **Automatic Group Creation**: Creates new tab groups automatically when no matching group exists
- **Pattern Examples for Grouping Rules**:
  - `*github.com*, *gitlab.com*` with group name "Git Repositories" - Groups all Git hosting sites
  - `https://docs.google.com*, *notion.so*` with group name "Documentation" - Groups documentation sites
  - `*stackoverflow.com*, *reddit.com/r/programming*` with group name "Dev Resources" - Groups programming help
  - `https://localhost*, *127.0.0.1*` with group name "Development" - Groups local development sites
  - `*youtube.com*, *vimeo.com*` with group name "Videos" - Groups all video sites

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select this extension folder
4. The extension icon will appear in your toolbar with a badge showing the current tab count

## Files Structure

- `manifest.json` - Extension configuration and permissions
- `background.js` - Service worker that handles badge updates, auto-grouping, duplicate prevention, auto-close, window labels, and Explorer pop-out
- `popup.html` - Popup interface HTML
- `popup.js` - Popup interface JavaScript
- `icons/` - Extension icons (placeholder)
 - `AI/` - Documentation for AI agents and maintainers (excluded from zips)

## Permissions

- `tabs` - Required to count and manage tabs
- `activeTab` - Required to interact with the current tab
- `tabGroups` - Required for auto-collapse and group management features
- `storage` - Required to save auto-close settings and URL patterns

## Usage

1. The badge on the extension icon will automatically show the current number of open tabs
2. Tab groups will automatically collapse when you're not actively using them
3. Click the extension icon to open the Tab Explorer:
   - Search under the header; filter and sort via toolbar controls
   - Click a page item to activate its tab; click the ✕ to close it
   - Use the Settings button to configure features; title switches to "Settings" when open (back chevron appears with a stroked icon for visibility). Header is taller with larger icons for legibility.
   - Use the pop-out button to open a standalone Explorer window (resizable)
4. **Auto-Close Pages** (click to expand):
   - Toggle the auto-close feature on/off
   - Set delay time (1-300 seconds) before closing matching pages (default: 15 seconds)
   - Add URL patterns using wildcards (*) to match specific pages
   - Click any pattern to edit it inline, or use Edit/Remove buttons
   - Perfect for login redirects, OAuth flows, and temporary pages
5. **Auto Tab Grouping** (click to expand):
   - Toggle auto tab grouping on/off (enabled by default)
   - Choose whether to apply rules to already grouped tabs (disabled by default)
   - Choose whether to ignore pinned tabs (enabled by default)
   - Enable auto-close of single-tab groups (enabled by default)
   - Select where to add tabs within groups: beginning (Left) or end (Right)
   - Create custom grouping rules with multiple URL patterns, group names, and optional colors
   - Use "Random" color option for automatic color assignment
   - Separate multiple URL patterns with commas (e.g., `*github.com*, *gitlab.com*`)
   - Rules automatically create and organize tab groups based on URL patterns
   - Single-tab groups are automatically ungrouped to keep your tab bar clean
6. **Duplicate Tab Prevention** (click to expand):
   - Toggle duplicate prevention on/off (enabled by default)
   - Choose whether to close newer or older tabs when duplicates are found
   - Add exception patterns for URLs that should be allowed to have duplicates
   - Great for preventing multiple instances of the same page and saving resources

   ## Window Labels

   You can assign a short label to each Chrome window using the popup. The label is prefixed to the document.title of each tab in that window so the native window title shows the label when a tab is active.

   How to use:

   1. Click the extension icon to open the popup.
   2. If the current window is unnamed, the popup shows a minimal “Name this window” view first. Save a label and the popup refreshes to the full Explorer automatically.
   3. In Settings → Window Name:
      - Enter a name in the input and click Save.
   - Use “Show label prefix on page titles” to enable/disable the visible [Label] prefix on tabs for the current window only. Disabling clears existing prefixes in the current window and prevents future injections. Re-enabling restores the prefix across eligible tabs immediately.
   3. The label, when enabled, will be applied to all eligible tabs in the current window and appear as a prefix like: [Work] Page Title.

   Limitations:

   - The extension cannot modify the OS-level window title directly; this prefixing is a workaround that relies on modifying tab document titles.
   - Special pages (e.g., chrome:// pages, the Web Store, some extension pages) do not allow content script injection and won't show the label.
   - Some websites or single-page apps may overwrite document.title repeatedly; the extension uses a MutationObserver to re-apply the prefix but it may not always win.
   - Labels are stored locally in `chrome.storage.local` and cleared when the window is closed.

   Tip:

   - When the toolbar badge shows a red “!”, it means the current window is unnamed. Open the popup to set a name; the badge will switch to the count immediately after saving.

## Explorer behavior

- Default hierarchy: Window → Group → Page. When searching or using non-"All" filters, hierarchy becomes Title → Window → Group.
- Title grouping removes the window label prefix (e.g., "[Work]") only when it matches the stored label for that window, keeping genuine bracketed titles intact.

## Help: navigating Tab Explorer

The page list items are interactive to streamline navigation.

- Click anywhere on a page item to activate that tab (the popup closes immediately to avoid focus issues).
- Click the red ✕ on the right side of the item to close the tab.

Screenshot:

![Click-to-Go and Close example](docs/screenshots/tab-item-help.png)

Note: If the image above doesn’t render, add a screenshot at `docs/screenshots/tab-item-help.png` showing a page item hovered with the red ✕ visible.

## Settings export/import format (versioned)

Starting with v1.0, exports are wrapped with metadata to support forward compatibility:

- Versioned format (v1.0):
   - Structure: `{ version: string, timestamp: string ISO8601, settings: object }`
   - Includes all keys from `chrome.storage.sync` (for example, `autoCloseEnabled`, `tabGroupRules`, `duplicatePreventionEnabled`, `explorerWindowSize`, etc.)
   - Excludes local-only data such as window labels in `chrome.storage.local`

Example (v1.0):

```json
{
   "version": "1.0",
   "timestamp": "2025-10-20T17:32:10.123Z",
   "settings": {
      "autoCloseEnabled": true,
      "closeDelay": 15,
      "urlPatterns": ["*login*", "https://accounts.google.com*"],
      "autoTabGroupingEnabled": true,
      "tabGroupRules": [
         { "patterns": ["*github.com*", "*gitlab.com*"], "groupName": "Git Repositories", "groupColor": "blue" }
      ],
      "duplicatePreventionEnabled": true,
      "allowedDuplicatePatterns": ["*docs.google.com*"],
      "explorerWindowSize": { "width": 900, "height": 720 }
   }
}
```

Legacy format (pre-v1.0):

- Structure: the settings object itself at the top level (no wrapper), e.g. `{ "autoCloseEnabled": false, ... }`

Migration notes:

- Import logic supports both the v1.0 wrapper and legacy bare settings automatically.
- Importing overwrites your current `chrome.storage.sync` keys; it does not modify `chrome.storage.local` (window labels remain unchanged).
- If you plan to share or back up settings between machines, prefer exporting in the v1.0 format for clarity and future compatibility.

## Development

The extension uses Manifest V3 and includes:
- Background service worker for persistent badge updates
- Event listeners for tab creation, removal, and updates
- Simple popup interface for additional functionality

## Future Enhancements

- Customizable auto-collapse delay settings
- Tab group color and naming management
- Advanced tab search and filtering
- Bookmark management integration
- Session saving and restoration
- Keyboard shortcuts for group management
- Tab group templates and presets
