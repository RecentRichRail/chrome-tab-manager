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
