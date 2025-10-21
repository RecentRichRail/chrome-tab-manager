# Privacy Policy — Chrome Tab Manager

Last updated: 2025-10-21

Chrome Tab Manager does not collect, transmit, or sell personal data. All processing happens on your device using Chrome’s extension APIs. No analytics, tracking pixels, or remote code are used.

## Data Processing (On-device only)
- The extension reads tab metadata (title, URL, group, window) to display, search, sort, and group your tabs.
- If you enable the optional per-window title prefix, a small script runs in pages to set or clear `document.title` with your window label. This script does not read page content and does not transmit any data.

## Storage
- The extension stores your preferences, window labels, and grouping rules using `chrome.storage.local` and/or `chrome.storage.sync` so they persist across sessions.
- This data remains within your browser profile and is not sent to the developer or third parties.

## Permissions — Why they’re needed
- tabs: List, read metadata (title/URL), activate, move, and close tabs to power the Explorer and actions.
- activeTab: Perform user-initiated actions on the current tab (e.g., activate/close) and allow one-off scripting where applicable.
- tabGroups: Create and manage Chrome tab groups based on your rules and actions.
- storage: Save your settings, rules, and window labels.
- scripting: Inject a minimal script to set/clear page titles with your chosen window label (when enabled).
- windows: Read the current window, maintain per-window labels, and update badges.
- host_permissions (<all_urls>): Required only so the title-prefix script can run on any site when you enable it. The script modifies `document.title` and does not read or exfiltrate page content.

## Remote Code
- None. All code ships with the extension; no eval, no dynamic code fetching, no remote JS/Wasm.

## Third Parties
- None. No third-party services receive your data.

## Changes to this Policy
If this policy changes, the “Last updated” date will be revised and updates will be published in this file.

## Contact
For questions or concerns, please open an issue in the repository.
