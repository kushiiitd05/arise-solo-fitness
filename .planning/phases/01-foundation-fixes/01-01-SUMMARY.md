---
phase: 01-foundation-fixes
plan: "01"
subsystem: api
tags: [supabase, typescript, auth, next.js]

# Dependency graph
requires: []
provides:
  - /api/xp/award safe against missing user_stats rows (maybeSingle on both queries)
  - /api/user GET/PATCH enforce Bearer-only auth (no query-param bypass)
affects: [02-quest-system, 03-xp-engine, any plan calling /api/xp/award or /api/user]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Always use .maybeSingle() instead of .single() when row may not exist"
    - "getUserId() helpers must only read Authorization Bearer header — never query params"

key-files:
  created: []
  modified:
    - src/app/api/xp/award/route.ts
    - src/app/api/user/route.ts

key-decisions:
  - "Separated error check from null check in /api/xp/award user fetch: error returns 500, missing user returns 404"
  - "getUserId() now returns null (not query param) when no Bearer token — GET/PATCH return 401"
  - "Pre-existing TS errors in Dashboard.tsx, GuildHall.tsx, guildBattleService.ts deferred — out of scope"

patterns-established:
  - "maybeSingle pattern: always use .maybeSingle() in Supabase fetches where row existence is uncertain"
  - "Bearer-only auth: API route helpers must not accept userId from URL params as auth fallback"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-15
---

# Phase 01 Plan 01: API Route Safety Fixes Summary

**Eliminated 406 PGRST116 crashes in /api/xp/award and closed userId query-param auth bypass in /api/user**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-15T00:00:00Z
- **Completed:** 2026-03-15T00:08:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Both Supabase queries in `/api/xp/award` now use `.maybeSingle()` — no 406 errors possible when user or user_stats row is missing
- `/api/user` GET and PATCH now require `Authorization: Bearer <token>` — `?userId=` query param no longer accepted as auth
- TypeScript check confirms zero new errors in modified files

## Task Commits

1. **Task 1: Fix .single() in /api/xp/award** - `db9d894` (fix)
2. **Task 2: Remove userId query-param bypass in /api/user** - `0a9fa96` (fix)
3. **Task 3: Verify TypeScript compilation** - `e65dadb` (chore)

## Files Created/Modified
- `src/app/api/xp/award/route.ts` - Both queries now use `.maybeSingle()`, user fetch separates DB error (500) from not-found (404)
- `src/app/api/user/route.ts` - `getUserId()` helper returns `null` instead of query param fallback

## Decisions Made
- Separated error path from null path in `/api/xp/award` user fetch: previously `error || !user` returned 404 for both; now `error` returns 500 and `!user` returns 404 for correct HTTP semantics
- Left POST handler in `/api/user` unchanged — it takes `id` from the request body and doesn't use `getUserId()`
- Pre-existing TypeScript errors in `Dashboard.tsx`, `GuildHall.tsx`, and `guildBattleService.ts` are out of scope for this plan and deferred to `deferred-items.md`

## Deviations from Plan

None — plan executed exactly as written, with one minor improvement: the user error/null check in `/api/xp/award` was split into two separate guards for correct HTTP status semantics (improvement to correctness, not scope creep).

## Issues Encountered
- `npx tsc --noEmit` reported 4 pre-existing errors in unrelated files. Confirmed zero errors in the two modified files. Pre-existing errors logged to `deferred-items.md`.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Both API safety fixes are in place; subsequent plans (quest completion, XP engine) can rely on `/api/xp/award` not crashing on missing stats rows
- Any client code passing `?userId=` to `/api/user` will now receive 401 — callers should be updated to use Bearer token

---
*Phase: 01-foundation-fixes*
*Completed: 2026-03-15*

## Self-Check: PASSED
- src/app/api/xp/award/route.ts — FOUND
- src/app/api/user/route.ts — FOUND
- .planning/phases/01-foundation-fixes/01-01-SUMMARY.md — FOUND
- Commit db9d894 — FOUND
- Commit 0a9fa96 — FOUND
- Commit e65dadb — FOUND
