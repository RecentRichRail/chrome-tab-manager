## 2024-05-24 - Missing Empty States in Dynamic Lists and Custom Element Focus

**Learning:** Found a recurring UX pattern where dynamically generated lists (URL patterns, tab group rules) lacked empty states. When a user first opens these sections or clears all items, the UI provides no feedback on what should happen next. Additionally, custom elements given a `role="button"` (like group headers) and generic buttons lacked `:focus-visible` states, severely impacting keyboard navigation.

**Action:** Always verify that dynamic lists have a fallback empty state component that guides the user (e.g., "No items added yet. Click Add to create one."). When reviewing interactive elements, explicitly test keyboard navigation (Tab key) to ensure custom focus styles are applied to all actionable elements, especially those missing native focus rings.
## 2024-07-16 - Dynamic ARIA labels in lists
**Learning:** For repeated actions like "Close tab" in a list, static `aria-label`s are unhelpful out of context for screen reader users. They hear "Close tab, Close tab" repeatedly.
**Action:** Always inject the item's title or identifier into the `aria-label` (e.g., "Close tab: Google Search") so the action is clear even when navigating by focus alone.
## 2026-07-18 - Dynamic View-Switching Button Labels
**Learning:** When a button toggles between views and changes its icon (e.g., from a gear to a back arrow), users relying on screen readers or tooltips remain unaware of the new function if the `aria-label` and `title` aren't updated dynamically alongside the icon.
**Action:** Always ensure that state-toggling buttons update their accessible names (`aria-label` and `title`) to accurately reflect their *current* action, rather than retaining their initial static label.
## 2024-05-18 - Missing dynamic ARIA context for inline edit actions
**Learning:** Found a recurring UX/a11y issue where dynamically injected inline edit forms (like editing a URL pattern or group rule) used generic `aria-label`s like "Save" or "Cancel". Screen reader users lack the visual context of which specific item in the list they are currently editing, leading to confusion if multiple forms are present or if they navigate away and back.
**Action:** Always inject the specific item's context (e.g., the URL or group name) into the `aria-label` of dynamically generated form actions (e.g., `aria-label="Save URL: pattern*"` instead of just "Save").
## 2024-07-23 - Async Action Feedback & Disabled States
**Learning:** For global async actions (like expanding/collapsing all tab groups or regrouping), users were left without immediate visual feedback. Missing `:disabled` states on the underlying `button` base styles meant the UI didn't communicate that an operation was in progress, leading to potential confusion or double-clicking.
**Action:** Always ensure that base component styles (like `.btn-glass` or generic `button`) explicitly support `:disabled` pseudo-classes with reduced opacity and a `not-allowed` cursor. Update the button text (e.g., "Regrouping..." -> "Regrouped!") dynamically during async operations to provide clear state communication.
## 2026-07-22 - Fix Escape Key Support in Inline Edits
**Learning:** The `keypress` event is deprecated and importantly, does not fire for non-character keys like `Escape` in modern browsers, preventing users from cancelling inline edits via keyboard.
**Action:** Always use `keydown` for keyboard accessibility, especially when handling navigation or control keys like Escape/Enter.
## 2026-07-24 - Consistent Theming and Layout Truncation
**Learning:** Found that tab list items used hardcoded text colors (e.g., #111827) and lacked layout safeguards (like text-overflow: ellipsis) for long titles or URLs, which could break the flex layout or clash with dark mode themes.
**Action:** Always prefer design system CSS variables (like `var(--text-primary)` and `var(--muted)`) over hardcoded colors, and explicitly handle text truncation for unbounded user-generated content (like URLs and page titles).
## 2024-05-18 - Empty State Recovery
**Learning:** Empty states in filtering UI often leave users stranded without an obvious way to recover, requiring manual backspacing or filter resetting.
**Action:** Always provide a 'Clear Filters' or 'Reset' CTA directly within the empty state to provide a one-click recovery path.
## 2026-07-29 - Explicitly Associate Help Text with Inputs
## 2026-07-30 - Explicit ARIA controls and state for custom accordions
**Learning:** When building custom div-based accordion elements, defining explicit `aria-controls` mappings between the toggle header and the content panel is crucial. It is also important to use `aria-expanded` to convey accordion state. Without this, screen readers cannot reliably convey the programmatic relationship and state.
**Action:** Always verify that interactive custom components explicitly map their IDs via standard ARIA attributes like `aria-controls` and `aria-expanded`.

## 2026-07-31 - Explicit ARIA controls for dynamic accordions
**Learning:** When building custom div-based accordion elements dynamically in JS (like the Tab Explorer groups), screen readers cannot reliably convey the programmatic relationship between the toggle header and the content panel without explicit IDs and `aria-controls`.
**Action:** Always verify that interactive custom components explicitly map their IDs via standard ARIA attributes like `aria-controls`, especially when generating elements on the fly in JavaScript.
## 2024-05-15 - Live Search Empty State DOM Preservation
**Learning:** When implementing empty states for live search or filtering logic that manipulates sibling elements in a single container, destructively overwriting the container using `.innerHTML` completely breaks the UX by unmounting the cached items when the query is cleared or backspaced.
**Action:** Always conditionally toggle the visibility of a dedicated, pre-existing (or isolated) empty state element instead of modifying the parent container's overall innerHTML.
## 2026-08-02 - Consistent Theming & Contrast
**Learning:** When refactoring hardcoded colors to CSS variables for UI components (especially in glassmorphic/themed designs), changing only the text color to a variable while leaving backgrounds or borders hardcoded can create critical accessibility/contrast failures if the theme changes (e.g. to dark mode).
**Action:** Always ensure that if a text color is updated to a theme variable, the element's background and border colors are also updated to corresponding theme variables to maintain safe contrast ratios across all states.
