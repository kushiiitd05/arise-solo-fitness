---
phase: 01-foundation-fixes
plan: "03"
subsystem: api
tags: [supabase, rls, user-creation, inventory, game-mechanics]

# Dependency graph
requires:
  - phase: 01-foundation-fixes
    provides: server route /api/user with service role key upsert (01-01)
provides:
  - createUser routed through /api/user server route (bypasses RLS)
  - new users receive 5 starter inventory items on awakening
  - calculateIntensityRank returns correct C-rank for 0.40+ ratio
affects: [02-feature-polish, user-onboarding, inventory, workout-tracking]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All write operations go through server-side API routes using service role key — never direct anon-key inserts"
    - "Starter item seeding is idempotent — seedStarterItems checks if items table is non-empty before inserting"
    - "Non-fatal side-effects (starter items) wrapped in try/catch so user creation is not blocked"

key-files:
  created: []
  modified:
    - src/lib/gameReducer.ts
    - src/lib/services/userService.ts

key-decisions:
  - "createUser no longer calls supabase.from(users).insert directly — uses fetch(/api/user) to ensure service role key handles all user writes"
  - "Starter item grant failure is non-fatal — wrapped in try/catch so a failed item seed does not prevent user creation from returning success"
  - "seedStarterItems + grantStarterItemsToUser called after server route confirms 200 OK, not before"

patterns-established:
  - "Client-side service functions must use server routes for writes — never direct Supabase anon-key inserts"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-03-15
---

# Phase 1 Plan 03: UserService Security + Starter Items + Intensity Rank Fix Summary

**createUser now routes through /api/user server route (bypasses RLS), new hunters receive 5 starter inventory items, and calculateIntensityRank C-rank threshold corrected from 4.0 to 0.40**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-15T12:00:00Z
- **Completed:** 2026-03-15T12:15:00Z
- **Tasks:** 4
- **Files modified:** 2

## Accomplishments
- Fixed calculateIntensityRank bug where C-rank (ratio >= 4.0) was unreachable since ratio is always 0-1
- Eliminated direct anon-key Supabase writes from createUser — now POSTs to /api/user which uses service role key
- New hunters now receive 5 starter items (Hunter's Badge, Mana Stone, Health Potion, Iron Dagger, Shadow Essence) on awakening
- Verified page.tsx handleAwaken interface is unchanged and fully compatible

## Task Commits

1. **Task 1: Fix calculateIntensityRank typo** - `bbac360` (fix)
2. **Task 2+3: Route createUser through /api/user + grant starter items** - `a9ab321` (fix)

## Files Created/Modified
- `src/lib/gameReducer.ts` - Fixed calculateIntensityRank: `ratio >= 4.0` changed to `ratio >= 0.40`
- `src/lib/services/userService.ts` - Replaced direct Supabase inserts with fetch("/api/user") POST; added seedStarterItems + grantStarterItemsToUser calls

## Decisions Made
- Tasks 2 and 3 committed together — they form a single cohesive change to userService.ts (server route + starter items both in createUser)
- Starter item failure is non-fatal so a missing items table or partial seed does not prevent user creation
- Pre-existing TypeScript errors in Dashboard.tsx, GuildHall.tsx, guildBattleService.ts confirmed present before this plan's changes — out of scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript check (`npx tsc --noEmit`) showed 4 errors, all confirmed pre-existing by running check before/after on stash. Errors are in Dashboard.tsx, GuildHall.tsx, guildBattleService.ts — unrelated to this plan's scope.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 (Foundation Fixes) is fully complete: 01-01 (API safety), 01-02 (level-up persistence), 01-03 (user creation security + starter items + intensity rank)
- Ready for Phase 2 — no blockers
- The 4 pre-existing TypeScript errors (Dashboard.tsx, GuildHall.tsx, guildBattleService.ts) should be addressed in a future phase

---
*Phase: 01-foundation-fixes*
*Completed: 2026-03-15*
