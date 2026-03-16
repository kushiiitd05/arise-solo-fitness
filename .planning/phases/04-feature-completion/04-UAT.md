---
status: testing
phase: 04-feature-completion
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md]
started: 2026-03-16T14:00:00Z
updated: 2026-03-16T14:00:00Z
---

## Current Test

number: 1
name: Arena lock screen at Rank E
expected: |
  Open the app at a character below level 10 (Rank E). Click the ARENA tab.
  You should see a lock screen — NOT the Arena component. It should show:
  - Copy mentioning "Rank D" required (not Rank C)
  - A progress bar showing XP/level progress toward Rank D (level 10)
  - Text showing how many levels remain until Rank D
awaiting: user response

## Tests

### 1. Arena lock screen at Rank E
expected: Open the app at a character below level 10 (Rank E). Click the ARENA tab. You should see a lock screen — NOT the Arena component. It should show copy mentioning "Rank D" required (not Rank C), a progress bar showing XP/level progress toward Rank D (level 10), and text showing how many levels remain until Rank D.
result: [pending]

### 2. Arena unlock flash on Rank D
expected: When a character reaches level 10 (Rank D) for the first time, a "COMBAT AUTHORIZATION GRANTED" flash animation appears on the ARENA tab and a notification fires ("+500 XP / +200 Gold / Arena Unlocked"). After the flash, Arena.tsx renders directly.
result: [pending]

### 3. Rank D+ Arena access
expected: With a character at level 10 or above (Rank D+), click the ARENA tab. The full Arena component renders directly — no lock screen, no gate.
result: [pending]

### 4. Mobile bottom navigation
expected: On a narrow screen (phone size or browser window narrowed below 1024px), a bottom navigation bar appears fixed at the bottom with 4 tabs: STATUS, GATES, STORAGE, ARENA. The active tab glows purple. Tapping a tab switches the panel. The nav disappears when you widen the browser above 1024px.
result: [pending]

### 5. ACHIEVEMENTS card in STATUS panel
expected: Go to the STATUS tab. In the right column, there should be an ACHIEVEMENTS card showing "RECENT ACHIEVEMENTS" with up to 3 real completed achievement names (e.g. "First Workout" if you've completed a quest) and a "View All →" prompt.
result: [pending]

### 6. Achievement Hall overlay opens
expected: Click the ACHIEVEMENTS card in the STATUS panel. A full-screen overlay slides in from the right showing the Achievement Hall. It should display achievement categories: ALL, FITNESS, SOCIAL, COLLECTION (no PVP or DUNGEON tabs).
result: [pending]

### 7. Achievement Hall overlay closes
expected: While the Achievement Hall overlay is open, click the close button (X). The overlay slides out and you return to the STATUS panel.
result: [pending]

### 8. GUILD tab in desktop nav
expected: On a wide screen (1024px+), the left sidebar should show 6 tabs: STATUS, SHADOWS, STORAGE, GATES, ARENA, GUILD. Clicking GUILD renders the Guild Hall component with the chat interface.
result: [pending]

### 9. GuildHall channel cleanup
expected: Click the GUILD tab so GuildHall loads. Then click away to another tab (e.g. STATUS). Open your browser's developer console — there should be NO errors about Supabase channels, "removeChannel", or subscription cleanup.
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
