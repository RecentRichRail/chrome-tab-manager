echo '
## 2024-10-17 - Avoid Duplicate Aria-Live Announcements in Buttons
**Learning:** To provide screen reader feedback for asynchronous button states, injecting a visually hidden aria-live element inside the button while simultaneously updating the button textContent causes screen readers to read the text twice.
**Action:** Always use a single, globally injected, visually hidden aria-live element (an announcer) located outside the button to handle state communications during async operations.' >> .jules/palette.md
