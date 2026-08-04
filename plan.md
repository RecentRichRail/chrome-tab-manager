1. **Initialize a reverse map:** Add `let tabIdToUrlMap = new Map();` alongside `tabUrlMap` definition in `background.js` to maintain a reverse mapping of tab IDs to their corresponding URLs.
2. **Update mapping logic:**
   - Modify `tabUrlMap.set(normalizedUrl, newTabId)` calls to also call `tabIdToUrlMap.set(newTabId, normalizedUrl)`.
   - Modify `tabUrlMap.delete(normalizedUrl)` calls to also call `tabIdToUrlMap.delete(id)`.
   - In `updateTabUrlMap()`, repopulate `tabIdToUrlMap` from scratch when rebuilding `tabUrlMap`.
3. **Optimize the deletion on `chrome.tabs.onRemoved`:** Replace the O(N) loop iterating over `tabUrlMap.entries()` in `chrome.tabs.onRemoved` listener with an O(1) lookup using `tabIdToUrlMap`:
   ```javascript
   const url = tabIdToUrlMap.get(tabId);
   if (url) {
     tabUrlMap.delete(url);
     tabIdToUrlMap.delete(tabId);
   }
   ```
4. **Test the changes:** Run `node -c background.js` to verify syntax. Run the benchmark to demonstrate the performance gain. Use `playwright` tests if available to make sure everything works correctly.
5. **Complete pre commit steps:** Complete pre commit steps to ensure proper testing, verifications, reviews and reflections are done.
6. **Submit PR:** Submit the change via `submit` tool with title "⚡ [Performance] Optimize duplicate tab tracking map deletion" and PR body containing What, Why, and Measured Improvement metrics.
