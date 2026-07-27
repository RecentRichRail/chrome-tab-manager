## 2025-02-15 - Frequent Async/DOM Rebuild in Popup Input
**Learning:** In Chrome extension popups, `input` events that trigger expensive operations like querying all windows (`chrome.windows.getAll`) and fully rebuilding the DOM without debouncing cause significant main thread blocking and UI jank. This is particularly problematic in popups which have strict performance constraints compared to regular web pages.
**Action:** Always debounce search/filter inputs (e.g., using a 250ms timeout) that trigger async extension API calls and large DOM updates.

## 2024-07-10 - N+1 Query in Chrome TabGroups API
**Learning:** Calling `chrome.tabGroups.get()` inside loops while building UI causes an N+1 query problem that blocks main thread rendering, making the popup feel sluggish when users have many tab groups.
**Action:** When building UIs that depend on tab group data, fetch all groups upfront using `chrome.tabGroups.query({})` and store them in a Map for fast O(1) synchronous lookups during the render loop.
## 2026-07-11 - N+1 Query in Chrome TabGroups API
**Learning:** Calling `chrome.tabs.query({ groupId: ... })` inside loops while building UI or background operations (like `collapseInactiveGroups`) causes an N+1 query problem that blocks the extension's execution thread, making the operation sluggish when users have many tab groups.
**Action:** When performing operations that depend on tab group data across multiple groups, fetch all tabs for the window upfront using `chrome.tabs.query({ windowId: ... })` and group them by `groupId` in a Map for fast O(1) synchronous lookups during the loop.
## 2025-02-15 - IPC Overhead in Tab Lifecycle Events
**Learning:** Frequent tab lifecycle events like `onCreated`, `onUpdated`, and `onActivated` can trigger many asynchronous `chrome.storage.sync.get` calls if settings aren't cached. While storage lookups are fast, the sheer volume of IPC (Inter-Process Communication) overhead caused by these redundant asynchronous calls blocks or slows down background scripts unnecessarily.
**Action:** Always cache extension settings in-memory within background scripts using a `chrome.storage.onChanged` listener to invalidate the cache when settings change. This ensures fast, synchronous memory lookups for critical path operations like duplicate detection or auto-grouping.

## 2025-07-28 - IPC Overhead in Tab Lifecycle Events
**Learning:** Frequent tab lifecycle events like `onCreated`, `onUpdated`, and `onActivated` can trigger many synchronous `chrome.tabs.query` calls if they are not debounced. While the query might seem innocuous, the sheer volume of IPC (Inter-Process Communication) overhead caused by these redundant asynchronous calls blocks or slows down background scripts unnecessarily, and also serialize all tab data for each call.
**Action:** Always debounce UI-updating functions that rely on `chrome.tabs.query({})` (like updating badges or lists) when they are invoked inside frequent tab lifecycle events.
## 2026-07-15 - Cache local storage to reduce IPC overhead
**Learning:** Frequent access to `chrome.storage.local` in tab lifecycle event listeners (e.g. `onUpdated`) causes significant IPC overhead and potential bottlenecks.
**Action:** Always cache frequently accessed storage settings in memory and use `chrome.storage.onChanged` to invalidate/update the cache.

## 2026-07-16 - Sequential IPC Latency in Bulk Operations
**Learning:** Performing Chrome extension API calls (like `chrome.scripting.executeScript` or `chrome.tabGroups.update`) inside a `for...of` loop with sequential `await`s causes significant latency, as each operation blocks the next waiting for IPC round-trips. This is especially problematic in bulk operations like expanding all groups or modifying all tabs in a window.
**Action:** When performing bulk operations across multiple tabs or groups, collect the returned Promises into an array and await them concurrently using `Promise.allSettled()` (or `Promise.all()`) to minimize IPC blocking.
## 2026-07-17 - Sequential IPC in UI Update Methods
**Learning:** Functions that frequently update UI state based on Chrome extension APIs (like badges or counts) can block the execution thread if multiple independent queries like `chrome.tabs.query({})` are executed with sequential `await`s, leading to compounded IPC delays.
**Action:** When gathering independent data to update UI (like total tabs, active tab context, or window info), always collect the queries in a `Promise.all()` array rather than executing them consecutively.

## 2026-07-18 - Sequential IPC in Popup Initialization
**Learning:** Functions that initialize extension popups (like `buildWindowExplorer`) can suffer from significant latency if they execute multiple independent data fetches sequentially (e.g., fetching windows, then groups, then labels, then storage settings). This delays the initial render of the UI and causes jank.
**Action:** Always group independent Chrome extension API calls into a single `Promise.all()` during popup initialization to minimize sequential IPC blocking overhead.

## 2026-07-20 - Avoid Sequential awaits for Chrome APIs
**Learning:** Sequential await calls for API operations like chrome.tabGroups.update inside loops compound IPC latency significantly in Chrome extensions when multiple groups/tabs are processed.
**Action:** Always collect promises for independent Chrome API operations within loops and execute them concurrently using Promise.allSettled().

## 2026-07-21 - Redundant Processing in Tab Lifecycle
**Learning:** The `chrome.tabs.onUpdated` event fires multiple times for a single page load (e.g., when the URL changes and then when status is 'complete'). Triggering processing logic like auto-close or auto-grouping directly in this event without debouncing causes redundant asynchronous API calls, which wastes main thread time and can lead to race conditions if timeouts aren't managed per tab.
**Action:** In Chrome extension development, consolidate and debounce `chrome.tabs.onUpdated` event handlers using a map of timeouts keyed by `tabId` to prevent redundant asynchronous operations and race conditions.
## 2026-07-26 - Redundant allocations in hot loops
**Learning:** Replacing regular expressions with string operations (like split and map) in hot loops can cause severe garbage collection and CPU bottlenecks due to redundant allocations if the pre-parsed patterns aren't cached.
**Action:** Always cache the pre-parsed patterns outside of hot paths (like O(N*M) tab/pattern filtering loops) when replacing regexes with string-based matching algorithms.
## 2026-07-24 - String Allocation Bottleneck in ReDoS Mitigation
**Learning:** ReDoS mitigations that replace Regex with `split()` and `.map()` can inadvertently introduce a severe O(N*M) garbage collection bottleneck when executed inside tight loops (like checking many patterns against many tabs).
**Action:** When migrating away from Regex to safe string matching for performance/security, explicitly pre-parse and cache the split patterns outside the hot path to avoid redundant memory allocations.
## 2026-07-27 - Batch DOM Mutations in Popup
**Learning:** Appending elements to a live DOM container inside a loop during popup rendering causes severe layout reflows and UI blocking when many tabs are open.
**Action:** Always construct complex DOM trees offline (using `DocumentFragment`) and append them to the document in a single operation.
