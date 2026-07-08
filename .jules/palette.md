## 2025-10-21 - Keyboard interactions on non-semantic HTML elements
**Learning:** This app frequently uses `div` elements as primary interaction targets (e.g., `.explorer-tab-item`) rather than native `button` or `a` tags. This means they are inherently inaccessible via keyboard and not recognized as interactive by screen readers.
**Action:** When finding click handlers attached to `div`s or `span`s, proactively add `role="button"`, `tabindex="0"`, `:focus-visible` styling, and `keydown` event listeners to ensure full accessibility parity.
