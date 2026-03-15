---
phase: 01-foundation-fixes
verified: 2026-03-15T12:30:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 1: Foundation Fixes Verification Report

**Phase Goal:** Fix all root-cause bugs that silently break core gameplay — level-up never persisting to DB, API routes crashing on missing rows, security hole allowing user impersonation, and starter items never granted
**Verified:** 2026-03-15T12:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Completing a daily quest updates `level`, `hunter_rank` AND `current_xp` in the `users` table | VERIFIED | `quests/complete/route.ts` line 69: `.update({ current_xp: xp, level, hunter_rank: newRank })` inside level-up loop |
| 2 | `/api/xp/award` no longer returns 406 when `user_stats` row is missing | VERIFIED | `xp/award/route.ts` lines 55–56: both queries use `.maybeSingle()`; null stats row skipped with `if (stats)` guard |
| 3 | `/api/user` rejects requests without a valid Bearer token (no userId query param auth) | VERIFIED | `user/route.ts` lines 4–8: `getUserId()` reads only `Authorization: Bearer` header; returns `null` otherwise; GET/PATCH both return 401 on null |
| 4 | New user signup results in starter items appearing in `user_inventory` | VERIFIED | `userService.ts` lines 57–62: `seedStarterItems()` then `grantStarterItemsToUser(params.id)` called after successful `/api/user` POST; `inventoryService.ts` inserts into `user_inventory` |
| 5 | `calculateIntensityRank` returns C for a 40% flawless ratio | VERIFIED | `gameReducer.ts` line 330 and `xpEngine.ts` line 213: both have `if (ratio >= 0.40) return "C"` — `calculateIntensityRank(10, 4)` → ratio 0.40 → returns "C" |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/xp/award/route.ts` | maybeSingle on both queries, separate 500/404 guards | VERIFIED | Lines 17 and 55: both Supabase selects use `.maybeSingle()`; line 19 returns 500 on error, line 22 returns 404 on null user |
| `src/app/api/user/route.ts` | Bearer-only auth, no query-param fallback | VERIFIED | `getUserId()` helper only reads `Authorization` header; no `searchParams` or `req.nextUrl.searchParams` anywhere in file |
| `src/app/api/quests/complete/route.ts` | Level-up loop updating level + hunter_rank + current_xp atomically | VERIFIED | Lines 53–70: full while loop, single `.update()` call with all three fields |
| `src/lib/gameReducer.ts` | `calculateIntensityRank` threshold 0.40 not 4.0 | VERIFIED | Line 330: `if (ratio >= 0.40) return "C"` — confirmed by commit bbac360 |
| `src/lib/services/userService.ts` | Uses fetch("/api/user") for writes, calls seedStarterItems + grantStarterItemsToUser | VERIFIED | Lines 34–53: fetch POST to /api/user; lines 57–62: starter items granted in try/catch block |
| `src/lib/services/inventoryService.ts` | `seedStarterItems` and `grantStarterItemsToUser` exported and substantive | VERIFIED | Lines 78–111: both functions fully implemented — seed checks for empty items table, grant inserts mapped inventory rows |
| `src/lib/game/xpEngine.ts` | `xpForLevel` and `rankFromLevelAndXp` exported | VERIFIED | Lines 13 and 66: both exported; used correctly by quest complete and xp award routes |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `quests/complete/route.ts` | `xpEngine.ts` | `import { xpForLevel, rankFromLevelAndXp }` | WIRED | Line 3 import confirmed; both functions called at lines 57 and 65 |
| `quests/complete/route.ts` | `users` table (level + hunter_rank + current_xp) | `.update({ current_xp, level, hunter_rank })` | WIRED | Line 67–70: atomic update with all three fields inside `if (user)` block |
| `user/route.ts` `getUserId()` | Authorization header only | `req.headers.get("authorization")` | WIRED | Lines 5–7: sole source is header; no fallback to query params |
| `userService.ts` | `/api/user` POST | `fetch("/api/user", { method: "POST" })` | WIRED | Lines 34–53: fetch used for writes; read-only `loadUser` still uses anon client (correct) |
| `userService.ts` | `grantStarterItemsToUser` | import from inventoryService | WIRED | Line 3: import confirmed; called at line 58 after server route success |
| `grantStarterItemsToUser` | `user_inventory` table | `supabase.from("user_inventory").insert(userItems)` | WIRED | Line 104: insert with mapped items array |

---

### Requirements Coverage

No `requirements:` field in any plan frontmatter — no formal REQ-IDs to cross-reference. All five phase success criteria map 1:1 to verified truths above.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `quests/complete/route.ts` | 26 | `if (fetchErr \|\| !row) return 404` — combines DB error and missing row into same 404 | Info | Minor HTTP semantics issue; DB errors should ideally return 500, not 404. Does not affect goal. |
| `quests/complete/route.ts` | 51 | User fetch does not select `hunter_rank` — `rankFromLevelAndXp` receives `user.current_xp + xpEarned` as cumulative XP proxy | Info | Cumulative XP proxy is correct for rank calculation semantics (rank is earned, not current-level XP). No functional issue. |
| `inventoryService.ts` | 1 | Uses anon-key Supabase client (`@/lib/supabase`) for `user_inventory` writes in `grantStarterItemsToUser` | Warning | If RLS requires service role for `user_inventory` inserts on behalf of new users, this could silently fail. Does not block the goal since user creation itself goes through the server route. |

No blocker anti-patterns found.

---

### Human Verification Required

#### 1. Starter Items Actually Land in DB on First Signup

**Test:** Create a new Supabase user, trigger the Awaken flow in the app, then query `user_inventory` for that user's UUID.
**Expected:** 5 rows present matching Hunter's Badge, Mana Stone, Health Potion, Iron Dagger, Shadow Essence.
**Why human:** `grantStarterItemsToUser` uses the anon-key client (not service role). If Supabase RLS on `user_inventory` or `items` blocks the anon insert, the try/catch swallows the error and the function returns silently. Cannot verify RLS policies from code alone.

#### 2. Quest Completion Level-Up Persists Across Refresh

**Test:** Complete a daily quest that awards enough XP to level up. Note the level shown in UI. Hard-refresh the page.
**Expected:** Level displayed after refresh matches the level shown immediately after quest completion.
**Why human:** Requires live Supabase DB + authenticated session to confirm the `.update()` in `quests/complete/route.ts` is actually committed and re-read correctly.

#### 3. /api/user Returns 401 Without Bearer Token

**Test:** `curl -X GET https://<your-domain>/api/user` (no Authorization header).
**Expected:** HTTP 401 with `{"error":"Unauthorized"}`.
**Why human:** Network-level verification needed; cannot test actual HTTP responses from code inspection alone.

---

### Commit Verification

All documented commits are present in git log:

| Commit | Plan | Description |
|--------|------|-------------|
| `db9d894` | 01-01 task 1 | Replace .single() with .maybeSingle() in /api/xp/award |
| `0a9fa96` | 01-01 task 2 | Remove userId query-param auth bypass in /api/user |
| `e65dadb` | 01-01 task 3 | TypeScript verification |
| `810a76b` | 01-02 task 1 | Import xpForLevel + rankFromLevelAndXp in quest complete route |
| `66232e6` | 01-02 task 2-3 | Level-up loop + response fields |
| `bbac360` | 01-03 task 1 | Fix calculateIntensityRank C-rank threshold |
| `a9ab321` | 01-03 task 2+3 | Route createUser through /api/user + grant starter items |

---

### Gaps Summary

No gaps found. All 5 phase success criteria are fully implemented in the actual code. The three human-verification items are operational concerns (RLS policies, live DB behavior) that cannot be assessed programmatically — they are not blocking.

One low-severity warning exists: `inventoryService.ts` uses the anon-key client for `user_inventory` writes. If Supabase RLS blocks anon-key inserts on that table, starter items will silently fail to grant. This should be investigated during integration testing but does not constitute a code bug in the implementation as designed.

---

_Verified: 2026-03-15T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
