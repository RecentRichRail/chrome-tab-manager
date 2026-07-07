## 2025-02-15 - Frequent Async/DOM Rebuild in Popup Input
**Learning:** In Chrome extension popups, `input` events that trigger expensive operations like querying all windows (`chrome.windows.getAll`) and fully rebuilding the DOM without debouncing cause significant main thread blocking and UI jank. This is particularly problematic in popups which have strict performance constraints compared to regular web pages.
**Action:** Always debounce search/filter inputs (e.g., using a 250ms timeout) that trigger async extension API calls and large DOM updates.
