## 2024-07-07 - XSS in User-Controlled Configuration via innerHTML
**Vulnerability:** DOM-based Cross-Site Scripting (XSS) vulnerability found in `popup.js` where user-controlled configuration data (e.g., URL patterns, tab group names) was interpolated directly into `.innerHTML` strings without prior sanitization.
**Learning:** Even internal configuration settings like URL matching patterns or UI group labels, which are typically perceived as "trusted" because they are self-configured, become an attack vector if synchronized across devices or manipulated via other extensions or stored settings.
**Prevention:** Establish a strict policy of utilizing `escapeHtml` for all dynamic data being injected into `.innerHTML`, or preferably, use DOM APIs like `.textContent` and `.createElement` which are inherently safe against injection.

## 2026-07-08 - [Stored XSS via Imported JSON Configuration]
**Vulnerability:** A Stored XSS vulnerability existed where `rule.groupColor` (loaded from JSON settings) was directly injected into the DOM via `innerHTML` without HTML escaping in `popup.js`.
**Learning:** Even internal configuration properties like colors, when imported from user-controlled files (like JSON setting imports), can be vectors for XSS if injected directly into HTML strings.
**Prevention:** Always sanitize or escape EVERY property from imported JSON objects before rendering them into the DOM via `innerHTML`, or prefer safe DOM methods like `textContent`.
