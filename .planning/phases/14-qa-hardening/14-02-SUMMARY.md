---
phase: 14-qa-hardening
plan: "02"
subsystem: security-auth-testing
tags: [rls, bearer-auth, vitest, integration-test, security, game-flow]
dependency_graph:
  requires: []
  provides:
    - arena_battles RLS policy (SELECT, anon-safe)
    - xp/award Bearer-only auth
    - quests/daily Bearer-only auth (GET + POST)
    - xp/award route unit tests (3 tests)
    - game flow integration test (5 tests)
  affects:
    - src/app/api/xp/award/route.ts
    - src/app/api/quests/daily/route.ts
    - supabase/migrations/20260320000001_arena_battles_rls.sql
tech_stack:
  added: []
  patterns:
    - getUserId() Bearer-only helper (copy-per-file pattern, consistent with Phase 3 decision)
    - makeChain() vitest mock helper for Supabase chains
    - Cross-route integration test via dynamic imports in src/__tests__/
key_files:
  created:
    - supabase/migrations/20260320000001_arena_battles_rls.sql
    - src/app/api/xp/award/route.test.ts
    - src/__tests__/gameFlow.test.ts
  modified:
    - src/app/api/xp/award/route.ts
    - src/app/api/quests/daily/route.ts
decisions:
  - getUserId() defined locally in each route file — consistent with Phase 3 copy-don't-import pattern
  - arena_battles SELECT-only policy — INSERT/UPDATE go through service-role route (bypasses RLS by design)
  - gameFlow.test.ts uses dynamic imports per describe-block — matches existing rank/advance test pattern
metrics:
  duration_seconds: 168
  completed_date: "2026-03-19"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 2
---

# Phase 14 Plan 02: Auth Gap Fixes + Game Flow Integration Tests Summary

One-liner: Bearer-only auth enforced on xp/award and quests/daily routes, arena_battles RLS added, and 8 new vitest tests prove the quest→XP→rank-advance game flow is server-authoritative.

## What Was Built

### 1. arena_battles RLS Migration
- Created `supabase/migrations/20260320000001_arena_battles_rls.sql`
- Enables RLS on `public.arena_battles` table
- SELECT policy restricts reads to the row owner via `auth.uid() = user_id`
- No INSERT/DELETE policies needed — all writes go through service-role server route

### 2. Auth Gap Fixes (2 routes patched)

**src/app/api/xp/award/route.ts:**
- Added `getUserId()` Bearer-only helper
- Removed `userId` from body destructure
- Route now returns 401 Unauthorized (not 400) when no Authorization header present

**src/app/api/quests/daily/route.ts:**
- Added `getUserId()` Bearer-only helper
- GET: removed `req.nextUrl.searchParams.get("userId")` — replaced with Bearer extraction
- POST: removed `body?.userId` — replaced with Bearer extraction
- Both handlers return 401 Unauthorized when no Authorization header present

### 3. Auth Gaps Closed (all 3 from research audit)
1. `POST /api/xp/award` — was accepting `userId` from request body; now requires Bearer header
2. `GET /api/quests/daily` — was accepting `userId` from query string; now requires Bearer header
3. `POST /api/quests/daily` — was accepting `userId` from request body; now requires Bearer header

### 4. New Test Files

**src/app/api/xp/award/route.test.ts (3 tests):**
- 401 when no Authorization header
- 400 when amount is 0
- 200 success with valid Bearer + amount

**src/__tests__/gameFlow.test.ts (5 tests):**
- Leg 1 — GET /api/quests/daily: returns quests for authenticated user; returns 401 without auth
- Leg 2 — POST /api/xp/award: awards XP with amountAwarded response; returns 401 without auth
- Leg 3 — POST /api/rank/advance: promotes E→D when dual-gate met and trialPassed=true

## Test Results

- New tests: **8 passing** (3 in route.test.ts + 5 in gameFlow.test.ts)
- Full suite: **118 passing** across 16 test files (0 failures)

## TypeScript

- 4 pre-existing TS errors in `chapterMapping.test.ts` and `ErrorBoundary.test.tsx` — out of scope (not caused by this plan's changes, deferred per deviation rule scope boundary)
- All plan-modified files: clean (0 errors in xp/award/route.ts, quests/daily/route.ts, new test files)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- supabase/migrations/20260320000001_arena_battles_rls.sql: FOUND
- src/app/api/xp/award/route.test.ts: FOUND
- src/__tests__/gameFlow.test.ts: FOUND
- src/app/api/xp/award/route.ts: FOUND (patched)
- src/app/api/quests/daily/route.ts: FOUND (patched)
- Commits: 9fb9fea (Task 1), 278e6b0 (Task 2), 46ee7ce (Task 3)
