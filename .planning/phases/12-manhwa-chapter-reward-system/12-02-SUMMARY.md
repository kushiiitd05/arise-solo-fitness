---
phase: 12-manhwa-chapter-reward-system
plan: 02
subsystem: api
tags: [supabase, chapters_unlocked, boss, quests, server-routes, typescript]

# Dependency graph
requires:
  - phase: 12-01
    provides: chapters_unlocked DB column migration and vitest scaffolds (CH-01/CH-02/CH-03)

provides:
  - POST /api/boss/complete increments chapters_unlocked (capped at 4) and returns chapter_newly_unlocked boolean
  - POST /api/quests/update increments chapters_unlocked inside allCompleted && !wasAllCompleted guard and returns chapter_newly_unlocked boolean
  - WorkoutEngine cleaned of rank-based chapter unlock logic (no client-side unlockNextChapter calls)

affects: [12-03, reader-component, chapter-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-then-write pattern for chapters_unlocked counter (same as extraction_tokens)"
    - "Server-authoritative cap: Math.min(currentChapters + 1, 4)"
    - "Outer-scope variable declaration for response fields (chaptersUnlockedCount/chapterNewlyUnlocked) — same pattern as leveledUp/newLevel/newRank"

key-files:
  created: []
  modified:
    - src/app/api/boss/complete/route.ts
    - src/app/api/quests/update/route.ts
    - src/components/arise/WorkoutEngine.tsx

key-decisions:
  - "chapters_unlocked increment added to boss/complete alongside existing extraction_tokens increment — single UPDATE writes both columns atomically"
  - "chapters_unlocked increment placed after hunter_rank update inside if(user) block in quests/update — stays within allCompleted guard"
  - "WorkoutEngine unlockedChapter state and JSX render block removed alongside the chapter unlock logic — no dangling UI components"
  - "BookOpen and chapterService imports cleaned from WorkoutEngine — no unused imports left after removal"

patterns-established:
  - "Server-only chapter unlock: no client-side unlockNextChapter/getChapterUrl calls anywhere"
  - "chapter_newly_unlocked boolean always returned in route response for client consumption"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-19
---

# Phase 12 Plan 02: Server-Side Chapter Unlock Wiring Summary

**chapters_unlocked read-then-write logic wired into both boss/complete and quests/update routes, returning chapter_newly_unlocked boolean; WorkoutEngine rank-based unlock block removed entirely**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-19T05:34:30Z
- **Completed:** 2026-03-19T05:42:30Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- POST /api/boss/complete now selects `extraction_tokens, chapters_unlocked`, computes `Math.min(currentChapters + 1, 4)`, writes both columns in a single UPDATE, returns `chapters_unlocked` and `chapter_newly_unlocked` in response JSON
- POST /api/quests/update expands user SELECT to include `chapters_unlocked`, increments inside the `if (allCompleted && !wasAllCompleted)` guard only, returns `chapters_unlocked` and `chapter_newly_unlocked` — double-increment prevented by the existing `wasAllCompleted` guard
- WorkoutEngine cleaned: chapterService import removed, rank-based `if (rankStr === "S" || rankStr === "A")` block removed, `unlockedChapter` useState and JSX removed, `BookOpen` icon import removed — 97/97 vitest tests pass

## Task Commits

1. **Task 1: Wire chapters_unlocked into POST /api/boss/complete** - `99d4a0f` (feat)
2. **Task 2: Wire chapters_unlocked into POST /api/quests/update** - `d12c40b` (feat)
3. **Task 3: Remove old rank-based chapter unlock from WorkoutEngine** - `9507883` (feat)

## Files Created/Modified

- `src/app/api/boss/complete/route.ts` - Added chapters_unlocked read-then-write + chapter_newly_unlocked response field
- `src/app/api/quests/update/route.ts` - Expanded user SELECT, added chapters_unlocked increment inside allCompleted guard, added fields to response JSON
- `src/components/arise/WorkoutEngine.tsx` - Removed chapterService import, rank-based unlock block, unlockedChapter state, and related JSX

## Decisions Made

- chapters_unlocked increment in quests/update placed after the hunter_rank update inside `if (user)` to reuse the already-fetched user row (includes the new chapters_unlocked field from expanded SELECT)
- unlockedChapter useState and JSX render block removed alongside the logic — no point keeping dead UI that rendered chapter unlock card; Plan 12-03 Reader component handles display differently
- BookOpen icon and chapterService imports cleaned to avoid TypeScript unused-import warnings

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed unlockedChapter useState and JSX block**
- **Found during:** Task 3 (WorkoutEngine cleanup)
- **Issue:** Plan specified removing the rank-based unlock block and the import, but the component also had `const [unlockedChapter, setUnlockedChapter] = useState(...)` and a JSX render block that referenced `unlockedChapter` — leaving them would cause TypeScript errors (unused state setter with no calls after removing the block)
- **Fix:** Removed `useState` declaration and the JSX conditional `{unlockedChapter && (...)}` block, plus removed `BookOpen` from lucide import
- **Files modified:** src/components/arise/WorkoutEngine.tsx
- **Verification:** `grep -c "unlockedChapter" WorkoutEngine.tsx` returns 0; all 97 vitest tests pass
- **Committed in:** 9507883 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical cleanup)
**Impact on plan:** Required for compile correctness. No scope creep — stays within Task 3 file.

## Issues Encountered

None — all route modifications straightforward. Vitest suite passed 97/97.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both server-authoritative chapter unlock triggers are in place
- Routes return `chapter_newly_unlocked: boolean` ready for Plan 12-03 to consume in the Reader component and dispatch CHAPTER notifications from quest/boss responses
- No client-side chapter unlock code remains in WorkoutEngine

---
*Phase: 12-manhwa-chapter-reward-system*
*Completed: 2026-03-19*
