## 2024-05-24 - Missing Empty States in Dynamic Lists and Custom Element Focus

**Learning:** Found a recurring UX pattern where dynamically generated lists (URL patterns, tab group rules) lacked empty states. When a user first opens these sections or clears all items, the UI provides no feedback on what should happen next. Additionally, custom elements given a `role="button"` (like group headers) and generic buttons lacked `:focus-visible` states, severely impacting keyboard navigation.

**Action:** Always verify that dynamic lists have a fallback empty state component that guides the user (e.g., "No items added yet. Click Add to create one."). When reviewing interactive elements, explicitly test keyboard navigation (Tab key) to ensure custom focus styles are applied to all actionable elements, especially those missing native focus rings.
## 2024-07-16 - Dynamic ARIA labels in lists
**Learning:** For repeated actions like "Close tab" in a list, static `aria-label`s are unhelpful out of context for screen reader users. They hear "Close tab, Close tab" repeatedly.
**Action:** Always inject the item's title or identifier into the `aria-label` (e.g., "Close tab: Google Search") so the action is clear even when navigating by focus alone.
## 2026-07-18 - Dynamic View-Switching Button Labels
**Learning:** When a button toggles between views and changes its icon (e.g., from a gear to a back arrow), users relying on screen readers or tooltips remain unaware of the new function if the `aria-label` and `title` aren't updated dynamically alongside the icon.
**Action:** Always ensure that state-toggling buttons update their accessible names (`aria-label` and `title`) to accurately reflect their *current* action, rather than retaining their initial static label.
