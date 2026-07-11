## 2025-02-15 - Frequent Async/DOM Rebuild in Popup Input
**Learning:** In Chrome extension popups, `input` events that trigger expensive operations like querying all windows (`chrome.windows.getAll`) and fully rebuilding the DOM without debouncing cause significant main thread blocking and UI jank. This is particularly problematic in popups which have strict performance constraints compared to regular web pages.
**Action:** Always debounce search/filter inputs (e.g., using a 250ms timeout) that trigger async extension API calls and large DOM updates.

## 2024-07-10 - N+1 Query in Chrome TabGroups API
**Learning:** Calling `chrome.tabGroups.get()` inside loops while building UI causes an N+1 query problem that blocks main thread rendering, making the popup feel sluggish when users have many tab groups.
**Action:** When building UIs that depend on tab group data, fetch all groups upfront using `chrome.tabGroups.query({})` and store them in a Map for fast O(1) synchronous lookups during the render loop.
## 2026-07-11 - N+1 Query in Chrome TabGroups API
**Learning:** Calling `chrome.tabs.query({ groupId: ... })` inside loops while building UI or background operations (like `collapseInactiveGroups`) causes an N+1 query problem that blocks the extension's execution thread, making the operation sluggish when users have many tab groups.
**Action:** When performing operations that depend on tab group data across multiple groups, fetch all tabs for the window upfront using `chrome.tabs.query({ windowId: ... })` and group them by `groupId` in a Map for fast O(1) synchronous lookups during the loop.
