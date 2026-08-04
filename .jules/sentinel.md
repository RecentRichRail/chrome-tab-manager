## 2024-07-07 - XSS in User-Controlled Configuration via innerHTML
**Vulnerability:** DOM-based Cross-Site Scripting (XSS) vulnerability found in `popup.js` where user-controlled configuration data (e.g., URL patterns, tab group names) was interpolated directly into `.innerHTML` strings without prior sanitization.
**Learning:** Even internal configuration settings like URL matching patterns or UI group labels, which are typically perceived as "trusted" because they are self-configured, become an attack vector if synchronized across devices or manipulated via other extensions or stored settings.
**Prevention:** Establish a strict policy of utilizing `escapeHtml` for all dynamic data being injected into `.innerHTML`, or preferably, use DOM APIs like `.textContent` and `.createElement` which are inherently safe against injection.

## 2026-07-08 - [Stored XSS via Imported JSON Configuration]
**Vulnerability:** A Stored XSS vulnerability existed where `rule.groupColor` (loaded from JSON settings) was directly injected into the DOM via `innerHTML` without HTML escaping in `popup.js`.
**Learning:** Even internal configuration properties like colors, when imported from user-controlled files (like JSON setting imports), can be vectors for XSS if injected directly into HTML strings.
**Prevention:** Always sanitize or escape EVERY property from imported JSON objects before rendering them into the DOM via `innerHTML`, or prefer safe DOM methods like `textContent`.

## 2026-07-09 - [ReDoS via Unsanitized Wildcard to Regex Conversion]
**Vulnerability:** A Regular Expression Denial of Service (ReDoS) vulnerability existed in `matchesPattern` (in both `background.js` and `popup.js`) where user-defined wildcard patterns containing multiple consecutive asterisks (e.g., `***a***`) were converted naively into `.*.*.*a.*.*.*`. When executed against non-matching strings, this could cause catastrophic backtracking, potentially hanging the extension's background worker permanently (Persistent DoS) if the pattern was imported via a malicious JSON configuration.
**Learning:** Naive conversion of wildcards (`*`) to regex match-alls (`.*`) is dangerous if the input allows for consecutive wildcards without optimization. An attacker can craft a configuration that triggers exponential regex evaluation times.
**Prevention:** Always sanitize wildcard inputs by collapsing consecutive wildcards (e.g., `pattern.replace(/\*+/g, '*')`) before converting them into regular expressions to mitigate catastrophic backtracking.
## 2024-05-18 - URL Logging Exposes Sensitive Data
**Vulnerability:** The extension logged raw URLs to the background console on every tab creation, update, match, and close event.
**Learning:** These raw URLs often contain sensitive parameters (like OAuth tokens or PII). The console.log statements were intended for debugging but inadvertently created a potential data leak via the extension's logs.
**Prevention:** Implement a sanitizeUrlForLog function to strip query parameters and fragments (retaining only origin + pathname) before passing URLs to console.log.

## 2026-07-10 - [Authorization Bypass in Background Messaging]
**Vulnerability:** An authorization bypass vulnerability existed in `background.js` where `chrome.runtime.onMessage` listeners processed sensitive actions (e.g., `closeTab`, `activateTab`, `setWindowLabel`, and setting configuration states) without verifying the origin of the message. This allowed any website or content script to send messages and trigger privileged actions.
**Learning:** Chrome extension message listeners (`onMessage`) accept messages from any origin (including content scripts and injected scripts) by default unless restricted. Without authorization checks, any page context can invoke background operations.
**Prevention:** Always verify the `sender.url` in `chrome.runtime.onMessage` listeners to ensure the message originates from a trusted extension page (e.g., using `!sender.url || !sender.url.startsWith(chrome.runtime.getURL(''))`) when handling privileged or sensitive actions.
## 2026-07-15 - Predictable Token Generation
**Vulnerability:** Weak, predictable tokens were generated using `Date.now()` in `background.js` for banner actions, potentially allowing an attacker to spoof messages and bypass intended workflows.
**Learning:** Relying on timestamps (`Date.now()`) for security-sensitive tokens makes them predictable and vulnerable to forgery or brute-forcing.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomUUID()` for generating tokens or nonces.
## 2026-07-16 - ReDoS via Wildcard Patterns\n**Vulnerability:** The `matchesPattern` function replaced consecutive wildcards (`*+` to `*`) to prevent ReDoS, but it failed to enforce length limits on the provided URL or the pattern. Complex patterns like `*a*b*c...` could still be constructed to cause CPU and memory exhaustion when evaluated against long inputs.\n**Learning:** Collapsing wildcards alone is not a sufficient mitigation for ReDoS if pattern and input lengths are unbounded.\n**Prevention:** To prevent ReDoS (Regular Expression Denial of Service) when compiling user-provided wildcard patterns into regexes, always enforce strict character length limits on both the user-provided pattern and the input string being tested.
## 2026-07-21 - Eliminating ReDoS by avoiding RegExp for wildcards\n**Vulnerability:** A ReDoS vulnerability existed in `matchesPattern` because user-provided wildcard patterns (e.g., `*a*a*a*`) were compiled into regexes (`.*a.*a.*a.*`). When tested against long URLs that failed near the end, modern regex engines experienced catastrophic backtracking ((2^N)$ complexity), freezing the application.\n**Learning:** Relying on regular expressions to implement simple wildcard matching is inherently risky when patterns and inputs are unbounded or complex. Merely collapsing consecutive wildcards (`***` -> `*`) is insufficient to prevent ReDoS from interleaved patterns.\n**Prevention:** To completely eliminate ReDoS risks in wildcard pattern matching, avoid dynamic `new RegExp` compilation entirely and instead use safe string-based matching algorithms (`indexOf`, `startsWith`, `endsWith`).
## 2026-07-22 - Storage Quota Exhaustion / DoS via Unbounded Input lengths
**Vulnerability:** User inputs for URL patterns and tab group rules in `popup.js` were not subjected to length limitations before being saved to `chrome.storage.sync`.
**Learning:** `chrome.storage.sync` has strict quotas (`QUOTA_BYTES_PER_ITEM` is 8KB, `MAX_ITEMS` is 512, and `QUOTA_BYTES` is 100KB total). Allowing unbounded text entry permits malicious or accidental inputs to easily exhaust these storage quotas, leading to a Denial of Service (DoS) for the extension's configuration capabilities, and potentially crippling the regex parser when extremely long strings are evaluated.
**Prevention:** To prevent `chrome.storage.sync` quota exhaustion and potential Denial of Service (DoS) in Chrome extensions, strictly limit the character length of user inputs (such as URL patterns and group names) before saving them to storage.
## 2026-07-29 - DoS Risks in Settings Inputs
**Vulnerability:** Missing length and size limits on inputs that are saved to extension storage.
**Learning:** Unconstrained inputs can exhaust storage quotas and memory, leading to DoS.
**Prevention:** Always enforce strict length and size limits on all user-provided data, including file uploads and label inputs.

## 2026-08-01 - DoS Risks in Settings Inputs via auxiliary UI
**Vulnerability:** The standalone window naming prompt lacked input length limits, exposing the extension to storage quota exhaustion DoS.
**Learning:** Input validation must be consistently applied across all entry points, including secondary UIs like popouts or standalone pages.
**Prevention:** Enforce strict length limits at both the client-side UI and the backend message listener.
## 2026-08-03 - Prevent Type Confusion in JSON Import
**Vulnerability:** Logic DoS via Type Confusion (missing type validation on imported JSON objects)
**Learning:** When importing settings, arrays like `urlPatterns` could be overwritten with strings/other types, causing crashes when methods like `.some()` or `.forEach()` are called on them.
**Prevention:** Always validate the structure and types of imported JSON configurations, enforcing arrays and string elements before storing them.
## 2026-08-04 - DOM-based XSS in Extension Content Scripts
**Vulnerability:** XSS via auto close banner injection using innerHTML in a content script.
**Learning:** Using innerHTML with potentially user-controlled data or even just string interpolation in injected scripts poses a significant XSS risk, as the content script runs in the context of the vulnerable page.
**Prevention:** Always use safe DOM creation methods like document.createElement and textContent when building UI in injected scripts.
