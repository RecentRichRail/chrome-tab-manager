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

## 2026-07-28 - Batched DOM mutations in popup
**Learning:** In Chrome extension popups, appending elements to a live DOM container inside a loop can cause severe layout reflows and UI blocking when many tabs are open or many rules exist.
**Action:** Always construct complex DOM trees offline (using DocumentFragment) and append them to the document in a single operation.
## 2024-05-18 - Batching Sequential IPC Calls
**Learning:** Sequential `await` calls to Chrome extension APIs (like `chrome.action.setBadgeText`) introduce measurable Inter-Process Communication (IPC) overhead, especially on hot paths like tab updates.
**Action:** Use `Promise.allSettled()` to batch and concurrently execute consecutive, independent API calls, reducing cumulative latency while gracefully handling individual operation failures.
## 2026-07-30 - N+1 Query in Rules Loop
**Learning:** Calling `chrome.tabs.query({})` inside a loop for each tab grouping rule causes significant N+1 IPC overhead and blocks the main thread during 'Regroup All Tabs' operations.
**Action:** Fetch all tabs once before the loop and pass the cached list down to the rule processing function to minimize redundant IPC calls.
## 2026-08-01 - Avoid Sequential IPC latency processing windows concurrently
**Learning:** Processing tabs or tab groups across multiple windows sequentially using `for...of` loops and `await` for Chrome API calls (like `chrome.tabGroups.query`, `chrome.tabs.group`, `chrome.tabGroups.update`) causes significant IPC bottlenecks, slowing down background operations like auto-grouping.
**Action:** When performing bulk grouping operations across multiple windows, collect the promises in an array and use `Promise.allSettled` to execute them concurrently.
## 2026-08-01 - String Allocation Bottleneck in Hot Loops
**Learning:** Reusing string allocation methods like `.toLowerCase()` repeatedly inside `.some()` loops checking multiple configurations (like matching multiple URL patterns) during rapid tab lifecycle events leads to a significant garbage collection bottleneck and blocks the main thread.
**Action:** When validating a single input against multiple rules or patterns in a hot loop, always pre-calculate transformed states (like case-normalization) outside the loop and pass it down to avoid redundant O(N) memory allocations.
## 2025-08-01 - String Allocation Bottleneck in DOM Event Handlers
**Learning:** Performing expensive string allocations like `.toLowerCase()` inside UI iteration loops directly bound to high-frequency DOM events (like search box `input` handlers) leads to noticeable typing jank and excessive garbage collection when processing hundreds of elements.
**Action:** When creating filterable lists of DOM elements, always pre-calculate normalized strings (like lowercased values) during the initial fetch or render phase, attach them to the DOM elements as `data-` attributes, and read from those attributes during filtering to achieve O(1) string matching without allocations.
## 2026-08-04 - Optimize hot paths by removing heavy synchronous operations

**Learning:** When performing operations in tight nested loops (like pattern matching across multiple tabs and rules), synchronous heavy operations like `console.log` coupled with string allocations and URL parsing (e.g., `new URL()`) introduce massive overhead (over 90% execution time).

**Action:** Remove non-essential debug logs and heavy string transformations from O(N*M) hot paths to dramatically reduce CPU time and improve latency. Benchmark using `perf_hooks` or `performance.now()` before and after such changes to quantify the improvement.
## 2026-08-05 - Avoid heavy logs in hot loops
**Learning:** Placing `console.log` statements combined with string manipulations/allocations (like `sanitizeUrlForLog`) inside tight nested loops (O(N*M)) leads to massive CPU overhead and blocks the main thread in background scripts, even if the user isn't actively looking at the console.
**Action:** Always verify that heavy logging operations, especially those performing URL parsing or string replacements, are completely removed from or gated out of high-frequency loops like array `.some()` or `.forEach()` in production code.

## 2026-08-05 - Cache string transformations before template literals in hot loops
**Learning:** Calling functions like `escapeHtml` repeatedly inside template literals within a hot loop (like rendering many tabs in the UI) causes redundant CPU overhead and slows down UI rendering.
**Action:** Cache the results of string transformations in local variables immediately before constructing the template string to minimize CPU cycles and improve rendering performance.
## 2024-05-19 - Escape HTML Optimization
**Learning:** In hot loops mapping objects implicitly with `{}` causes garbage collection issues. Moving static dictionaries outside of `replace` methods removes redundant memory overhead per loop execution.
**Action:** When a method dynamically instantiates mappings specifically inside character iterators (like in `replace`), declare and reuse the object out of scope instead to lower memory usage.
## 2026-08-06 - Redundant string allocations in early exit paths
**Learning:** Functions that accept configuration arrays (like list of patterns to match) and default to empty arrays will unnecessarily allocate memory (like `toLowerCase` and `split`) if the string operations occur before checking if the array is empty. This adds measurable overhead per iteration, especially during hot paths like tab updates.
**Action:** Always place early returns (e.g., `if (!patterns || patterns.length === 0) return false;`) before any string manipulation or parsing logic to avoid redundant O(1) CPU/memory cost when features are disabled by default.
## $(date +%Y-%m-%d) - Optimize URL Normalization via String Slicing
**Learning:** Using `String.prototype.split('#')[0]` for removing hash fragments from strings incurs unnecessary array allocation and full string traversal overhead compared to `indexOf('#')` and `slice()`. When parsing tens of thousands of URLs sequentially (e.g. during duplicate tab processing or tab grouping), this can cause blocking.
**Action:** Prefer using `indexOf` and `slice` over `split` for simple string truncation operations in hot paths.

## 2024-08-14 - Remove redundant sanitizeUrlForLog from auto tab grouping hot path
**Learning:** Frequent logging calls with string allocations and object creations (`new URL`) in hot paths like tab lifecycle events (`handleAutoTabGrouping`) can cause significant CPU and main thread blocking, even when not actively debugging.
**Action:** Remove or hoist heavy `console.log` statements and `sanitizeUrlForLog` calls from hot loops/paths to improve extension responsiveness during rapid tab state changes.
## 2026-08-16 - Avoid URL Parsing in Auto-Close Hot Path
**Learning:** Calling `sanitizeUrlForLog` inside `handleAutoClose` causes massive CPU overhead because it constructs a `new URL()` and performs string manipulation on every tab status change, regardless of whether a pattern matches.
**Action:** Remove non-essential `console.log` statements containing heavy parsing logic from tab lifecycle hot paths to dramatically reduce CPU time.
## 2026-08-17 - Avoid redundant string allocations in UI render loops
**Learning:** Re-computing string transforms like `.toLowerCase()` inside UI rendering loops or input filter event handlers causes unnecessary memory allocations and garbage collection, severely degrading performance and causing jank during typing or when rendering large lists (like thousands of tabs).
**Action:** Always pre-compute and store normalized string formats (like lowercase values for searching) during the initial data processing phase and reuse them directly in the render or filter loops.
## 2026-08-18 - Avoid redundant string allocation and matching when normalized URL equals original
**Learning:** Functions that normalize input (like stripping hash fragments) and check multiple patterns against both the original and normalized forms perform unnecessary redundant string allocation (`.toLowerCase()`) and double pattern matching if the input string is not modified by normalization.
**Action:** In pattern-matching hot loops, check if the normalized form equals the original form, and if so, perform an early return with a single pattern check against the original form. This halves string allocations and matching overhead for standard inputs.
## 2024-08-20 - Cache parsed patterns in UI hot paths
**Learning:** Frequent UI interactions (like search filtering on keystrokes) that rely on complex URL pattern matching can trigger redundant array allocations and string splitting (e.g., `pattern.split('*')`). Caching the parsed objects prevents O(N) allocations in these tight render loops.
**Action:** When filtering lists against patterns, cache the compiled/parsed pattern objects globally or per-session instead of parsing them from scratch on every filter pass.
