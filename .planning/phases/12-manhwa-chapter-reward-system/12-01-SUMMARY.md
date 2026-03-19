---
phase: 12-manhwa-chapter-reward-system
plan: 01
subsystem: database, testing
tags: [supabase, migration, vitest, chapters, notifications]

# Dependency graph
requires:
  - phase: 10-shadow-army-mechanics
    provides: extraction_tokens migration pattern (ALTER TABLE column-add template)
  - phase: 06-xp-engine-tests
    provides: vitest infrastructure and test file conventions
provides:
  - chapters_unlocked INTEGER column on users table (DEFAULT 1)
  - 11 passing pure-logic tests for counter increment, quest guard, and DB-to-state mapping
  - CHAPTER notification dismiss duration fixed to 6500ms
affects:
  - 12-02: Route implementations will read/write chapters_unlocked column established here
  - 12-03: Session init will use mapping logic tested in chapterMapping.test.ts

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 scaffolding: write pure-logic tests before route implementations (contracts first)"
    - "ALTER TABLE ADD COLUMN IF NOT EXISTS for additive DB migrations"

key-files:
  created:
    - supabase/migrations/20260319_chapters_unlocked.sql
    - src/__tests__/chapterUnlock.test.ts
    - src/__tests__/chapterMapping.test.ts
  modified:
    - src/components/system/SystemNotification.tsx

key-decisions:
  - "chapters_unlocked uses INTEGER count (not array of IDs) — index-based mapping to chapters[] array is provably correct and maps correctly from any DB value"
  - "DEFAULT 1 ensures all existing users have Chapter 1 accessible without backfill — aligns with initialState.chapters[0].unlocked=true"
  - "Wave 0 test scaffolds use pure inline logic (Math.min, guard conditions) — no route imports, no mocks, tests are always runnable regardless of route state"
  - "CHAPTER notification dismiss 6500ms chosen to give adequate reading time for chapter unlock notifications (longer than default 5000ms)"

patterns-established:
  - "Wave 0 scaffolding: pure-logic test files document the contract before routes implement it"
  - "idx < chaptersUnlocked mapping pattern: 0-based array index compared to 1-based counter (not ch.id string)"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 12 Plan 01: Manhwa Chapter Reward System — Foundation Summary

**chapters_unlocked INTEGER column migrated to users table + 11 pure-logic vitest scaffolds for counter/mapping contracts + CHAPTER notification duration fixed to 6500ms**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T11:10:15Z
- **Completed:** 2026-03-19T11:15:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- DB migration adds `chapters_unlocked INTEGER NOT NULL DEFAULT 1` to users table — all existing users automatically get Chapter 1 accessible
- 11 vitest pure-logic tests pass covering CH-01 (boss kill increment + cap), CH-02 (quest completion guard), CH-03 (DB count to GameState.chapters mapping)
- SystemNotification.tsx CHAPTER dismiss duration updated from 5000ms to 6500ms

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration — add chapters_unlocked column** - `e56bc28` (feat)
2. **Task 2: Wave 0 test scaffolds for chapter logic** - `5138a53` (test)
3. **Task 3: Fix CHAPTER notification dismiss duration** - `10a1a53` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `supabase/migrations/20260319_chapters_unlocked.sql` - ALTER TABLE users ADD COLUMN chapters_unlocked INTEGER NOT NULL DEFAULT 1
- `src/__tests__/chapterUnlock.test.ts` - CH-01 (boss kill increment, cap) + CH-02 (quest guard) — 7 tests
- `src/__tests__/chapterMapping.test.ts` - CH-03 (DB count to chapters array mapping) — 4 tests
- `src/components/system/SystemNotification.tsx` - CHAPTER dismiss duration 5000 -> 6500

## Decisions Made

- `chapters_unlocked` stored as INTEGER count, not array of IDs — index-based mapping (`idx < chaptersUnlocked`) is provably correct and avoids storing redundant data
- `DEFAULT 1` ensures backward compatibility: existing users get Chapter 1 without any backfill migration
- Wave 0 scaffolds use only inline pure logic (no route imports) — tests always run cleanly regardless of Plan 02 implementation state
- CHAPTER duration set to 6500ms (not 5000ms) matching plan specification for chapter unlock events

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — `src/__tests__/` directory did not exist yet; created it before writing test files (Rule 3 - blocking, trivial).

## User Setup Required

None - no external service configuration required. Migration will be applied when Supabase CLI runs in production.

## Next Phase Readiness

- `chapters_unlocked` column is ready for Plan 02 route implementations (`/api/boss/complete`, `/api/quests/update`)
- Test contracts established in Wave 0 scaffolds — Plan 02 replaces placeholder assertions with real route tests
- All 97 existing tests pass, no regressions introduced

---
*Phase: 12-manhwa-chapter-reward-system*
*Completed: 2026-03-19*

## Self-Check: PASSED

- FOUND: supabase/migrations/20260319_chapters_unlocked.sql
- FOUND: src/__tests__/chapterUnlock.test.ts
- FOUND: src/__tests__/chapterMapping.test.ts
- FOUND: .planning/phases/12-manhwa-chapter-reward-system/12-01-SUMMARY.md
- FOUND commit: e56bc28 (feat migration)
- FOUND commit: 5138a53 (test scaffolds)
- FOUND commit: 10a1a53 (fix notification duration)
