## 2024-05-24 - Missing Empty States in Dynamic Lists and Custom Element Focus

**Learning:** Found a recurring UX pattern where dynamically generated lists (URL patterns, tab group rules) lacked empty states. When a user first opens these sections or clears all items, the UI provides no feedback on what should happen next. Additionally, custom elements given a `role="button"` (like group headers) and generic buttons lacked `:focus-visible` states, severely impacting keyboard navigation.

**Action:** Always verify that dynamic lists have a fallback empty state component that guides the user (e.g., "No items added yet. Click Add to create one."). When reviewing interactive elements, explicitly test keyboard navigation (Tab key) to ensure custom focus styles are applied to all actionable elements, especially those missing native focus rings.
