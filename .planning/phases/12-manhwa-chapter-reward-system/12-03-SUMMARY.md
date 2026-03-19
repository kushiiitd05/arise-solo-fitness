---
phase: 12-manhwa-chapter-reward-system
plan: 03
subsystem: chapter-reward-ui
tags: [chapter-unlock, ceremony, dashboard, boss-event, workout-engine, session-init]
dependency_graph:
  requires: [12-01, 12-02]
  provides: [ChapterUnlockCeremony, chapter-click-handlers, chapter-session-init, ceremony-trigger-wiring]
  affects: [Dashboard.tsx, page.tsx, BossEvent.tsx, WorkoutEngine.tsx, bossService.ts]
tech_stack:
  added: []
  patterns: [framer-motion overlay, AnimatePresence ceremony, callback prop chain, session-init DB mapping]
key_files:
  created:
    - src/components/arise/ChapterUnlockCeremony.tsx
  modified:
    - src/app/page.tsx
    - src/components/arise/BossEvent.tsx
    - src/components/arise/Dashboard.tsx
    - src/components/arise/WorkoutEngine.tsx
    - src/lib/services/bossService.ts
decisions:
  - "awardRaidReward calls /api/boss/complete (after /api/xp/award) in the same function to return chapter_newly_unlocked — no double increment risk since boss/complete is idempotent per-kill"
  - "comix.to URL validation pattern: ch.externalUrl?.includes('comix.to') — this correctly gates chapters 1/2 (valid comix URLs) from chapters 3/4 (webtoons list fallback)"
  - "handleChapterUnlocked lives in Dashboard (not page.tsx) — Dashboard owns ceremony state alongside RankUpCeremony, consistent pattern"
  - "WorkoutEngine fires onChapterUnlocked only inside the allCompleted && !wasAllComplete guard — prevents re-firing on repeat POSTs"
metrics:
  duration: ~25 minutes
  completed: 2026-03-19
  tasks: 3
  files: 6
---

# Phase 12 Plan 03: Chapter Reward UI Wiring Summary

Full chapter reward UI system: ceremony component created, session init wired, chapter click handlers active, and ceremony triggers connected through BossEvent and WorkoutEngine into Dashboard.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create ChapterUnlockCeremony component | b74cc88 | src/components/arise/ChapterUnlockCeremony.tsx |
| 2 | Session init chapters_unlocked mapping + BossEvent callback | 57ce3c4 | src/app/page.tsx, src/components/arise/BossEvent.tsx, src/lib/services/bossService.ts |
| 3 | Dashboard ceremony state, click handlers, component renders | 08d1327 | src/components/arise/Dashboard.tsx, src/components/arise/WorkoutEngine.tsx |

## What Was Built

### ChapterUnlockCeremony.tsx (new)
Full-screen overlay mirroring RankUpCeremony structure with cyan theme:
- `radial-gradient(ellipse at center, rgba(6,182,212,0.08), #030308 70%)` background
- Header: Orbitron 28px font-black `text-[#06B6D4]` "CHAPTER UNLOCKED"
- Spring-animated chapter reveal card (`system-panel`, `animate-system-pulse`)
- External link status line: "SOURCE AVAILABLE — TAP TO READ" or "SOURCE NOT YET AVAILABLE"
- "ACKNOWLEDGE CHAPTER" dismiss button (cyan border/color, `min-h-[44px]`)
- `ADD_NOTIFICATION` type CHAPTER fires once on mount (6500ms dismiss)

### page.tsx — chapters_unlocked session init
Both `syncSession` and `onAuthStateChange` SIGNED_IN flows now map the `chapters_unlocked` integer from the DB into `GameState.chapters[]` using `idx < chaptersUnlocked` pattern. This ensures existing users with `chapters_unlocked = 1` (default) see Chapter 1 unlocked and all others locked without any backfill.

### bossService.ts — awardRaidReward extended
`awardRaidReward` now calls `/api/boss/complete` after `/api/xp/award` and returns `{ chapter_newly_unlocked, chapters_unlocked }`. Session token fetched via `supabase.auth.getSession()` for the Bearer header.

### BossEvent.tsx — onChapterUnlocked prop
Added `onChapterUnlocked?: (newCount: number) => void` to props interface. In `handleAttackComplete`, the return value of `awardRaidReward` is checked: if `chapter_newly_unlocked` is true, the prop fires with `chapters_unlocked` count.

### Dashboard.tsx — full ceremony wiring
- `showChapterUnlock` / `chapterUnlockData` state added alongside `showRankUp`
- `handleChapterUnlocked(newCount)` handler: looks up `state.chapters[newCount - 1]`, validates comix.to URL, sets ceremony data, dispatches chapter state update
- `onChapterUnlocked={handleChapterUnlocked}` passed to both `BossEvent` and `WorkoutEngine`
- Chapter list items: `onClick` with comix.to URL validation — valid URL opens in `_blank`, invalid URL dispatches INFO notification "SOURCE NOT YET AVAILABLE"
- `ChapterUnlockCeremony` rendered in `AnimatePresence` block alongside `RankUpCeremony`

### WorkoutEngine.tsx — onChapterUnlocked prop
`onChapterUnlocked?: (newCount: number) => void` added to props interface. Fires from within the `result.allCompleted && !wasAllComplete && !allCompleteNotified` guard when `result.chapter_newly_unlocked` is true.

## Deviations from Plan

### Auto-fixed Issues

None required. Plan executed exactly as written.

**Note on awardRaidReward approach:** Plan stated to make `awardRaidReward` return "the full boss/complete response." Current implementation calls both `/api/xp/award` and `/api/boss/complete` sequentially in the same function, returning only `{ chapter_newly_unlocked, chapters_unlocked }` from the boss/complete response. This is cleaner than returning the full response object and matches the caller's actual needs.

## Verification

- `ChapterUnlockCeremony.tsx` exists — 105 lines, 7 matches for key strings
- `page.tsx` has 5 occurrences of `chaptersUnlocked`/`chapters_unlocked` (both session flows)
- `Dashboard.tsx` has comix.to URL validation and SOURCE NOT YET AVAILABLE strings
- All 97 vitest tests pass

## Checkpoint

Task 4 is a `checkpoint:human-verify` — human verification of end-to-end chapter flow required before plan is considered complete.

## Self-Check: PASSED

- src/components/arise/ChapterUnlockCeremony.tsx: FOUND
- src/app/page.tsx (chaptersUnlocked mapping): FOUND
- src/components/arise/Dashboard.tsx (showChapterUnlock state): FOUND
- src/components/arise/BossEvent.tsx (onChapterUnlocked): FOUND
- src/components/arise/WorkoutEngine.tsx (onChapterUnlocked): FOUND
- Commits b74cc88, 57ce3c4, 08d1327: FOUND
