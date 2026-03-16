# Phase 7: Full Rank Trial System - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Formal progression gate — when a hunter meets the dual-gate thresholds (minLevel AND minXp for next rank), they can initiate a rank trial: a specific workout challenge. The flow is: initiate trial → complete workout → pass/fail evaluation → rank advancement with rewards.

No new rank tiers. No changes to XP system. No PvP elements. No shadow slot system (deferred).

</domain>

<decisions>
## Implementation Decisions

### Trial Initiation
- Entry point: **Profile rank block** — the RANK_PROGRESSION block in Profile.tsx gets an "INITIATE TRIAL" button
- Button is only active when **both dual-gate conditions are met** (minLevel AND minXp for next rank) AND no 24h cooldown is active
- Initiating the trial opens a **full-screen takeover** — same pattern as WorkoutEngine (replaces current view entirely)
- Cooldown on failure: **24 hours**, stored as `trial_last_failed_at` timestamp in user_stats

### Trial Workout Challenge
- Separate **`RankTrialEngine` component** — modelled after WorkoutEngine but with trial-specific UI (rank badge, trial header, pass/fail state). WorkoutEngine stays unchanged.
- Trial requires all **4 exercise types**: push-ups, squats, sit-ups, cardio
- Difficulty: **2× the hunter's current daily quest rep targets** for each exercise (scales naturally with level — no new difficulty table needed)
- No time limit — complete at own pace (consistent with how daily quests work)

### Pass/Fail Evaluation
- **Pass condition**: Complete all 4 exercises at 2× rep targets — binary completion, no intensity rank requirement
- **Fail condition**: Hunter quits OR doesn't reach 2× targets for any exercise
- On failure: record `trial_last_failed_at` timestamp in user_stats + fire a system notification ("Trial failed. Cooldown: 24h.")
- INITIATE TRIAL button re-locks until 24h cooldown expires

### Rank-Up Ceremony
- On pass: **full-screen rank-up screen** — dedicated takeover with animated rank badge reveal, "RANK UP: E → D" header, reward summary
- Hunter dismisses the screen to return to Dashboard
- **Rewards**: 5 available stat points + rank-scaled XP bonus:
  | Rank Advance | XP Bonus |
  |-------------|---------|
  | E → D       | 1,000   |
  | D → C       | 2,000   |
  | C → B       | 5,000   |
  | B → A       | 10,000  |
  | A → S       | 25,000  |
  | S → NATIONAL| 50,000  |
- DB write: new **`POST /api/rank/advance`** server route — validates dual-gate + trial pass, writes new rank to `users` table, awards stat points to `user_stats`, dispatches XP bonus via existing `/api/xp/award`

### Claude's Discretion
- Exact animation style for the rank badge reveal (Framer Motion pulse/scale — reuse existing animation patterns)
- Visual design of RankTrialEngine UI (use existing hex palette and exercise card patterns from WorkoutEngine as reference)
- How `trial_last_failed_at` is added to user_stats (new column in migration or stored in existing JSONB/metadata field)
- Exact stat point grant mechanism in `/api/rank/advance` (can increment `available_stat_points` directly in user_stats)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rank engine (thresholds + formulas)
- `src/lib/game/xpEngine.ts` — `RANK_THRESHOLDS`, `rankFromLevelAndXp`, `nextRankInfo`, `HunterRank` type
- `src/lib/gameReducer.ts` — `GameState` type, `UserStats` (availablePoints field), dispatch patterns

### Trial entry point
- `src/components/arise/Profile.tsx` — RANK_PROGRESSION block where INITIATE TRIAL button lives

### Trial engine reference pattern
- `src/components/arise/WorkoutEngine.tsx` — component structure, exercise loop, rep counting, completion flow to model RankTrialEngine after

### Reward dispatch
- `src/app/api/xp/award/route.ts` — existing server route for XP awards; `/api/rank/advance` will call this for XP bonus dispatch

### Daily quest targets (used to derive 2× trial targets)
- `src/lib/game/xpEngine.ts` — `generateDailyQuestTargets(level, jobClass)` returns current targets; 2× these = trial targets

### Existing rank display (for ceremony)
- `src/components/arise/Dashboard.tsx` — compact rank HUD for reference
- `src/components/arise/Profile.tsx` — full RANK_PROGRESSION block for reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `nextRankInfo(currentRank)` — returns `{ nextRank, xpThreshold, levelThreshold }` — use this in Profile to check eligibility and display what's needed
- `generateDailyQuestTargets(level, jobClass)` — call this in RankTrialEngine to get base rep targets, then 2× them for trial
- `rankFromLevelAndXp(level, totalXp)` — use in `/api/rank/advance` to verify dual-gate server-side before writing rank
- WorkoutEngine exercise loop, rep counting (PostureGuard), timer, and AR toggle — RankTrialEngine can share the same MediaPipe/PostureGuard setup
- Notification system — `dispatch({ type: 'ADD_NOTIFICATION', ... })` for fail notification (SYSTEM type) and rank-up notification

### Established Patterns
- Full-screen component: accepts `{ state: GameState, dispatch, onClose: () => void }` props — follow same signature for RankTrialEngine
- Server routes: Bearer-only auth via `getUserId()` copied locally, use `supabaseServer`, no anon-client writes (Phase 3 principle)
- Gold color (#D97706/#F59E0B) reserved for rank UI elements — use in trial UI and ceremony screen
- All hex colors, no CSS variables: purple `#7C3AED`, cyan `#06B6D4`, gold `#D97706`, red `#EF4444`
- `sub.unsubscribe()` not `supabase.removeChannel()` for any real-time subscriptions
- Framer Motion `AnimatePresence` + `motion.div` already imported in Dashboard — use for rank-up ceremony animation

### Integration Points
- Profile.tsx RANK_PROGRESSION block — add eligibility check + INITIATE TRIAL button, wire `onTrialStart` callback
- Dashboard.tsx or page.tsx — render `<RankTrialEngine />` when trial is active (same pattern as WorkoutEngine render)
- `user_stats` table — needs `trial_last_failed_at` column (timestamptz, nullable) for cooldown tracking
- `/api/rank/advance` (new) — validates, writes `hunter_rank` to `users` table, increments `available_stat_points` in `user_stats`, calls `/api/xp/award` for XP bonus

</code_context>

<specifics>
## Specific Ideas

- Full-screen rank-up screen: Show old rank badge on left, animated arrow, new rank badge on right — e.g., "[ E ] → [ D ]" — then reward summary below
- Trial header should feel different from normal workout: "RANK TRIAL ACTIVE" badge in gold, rank target displayed prominently (e.g., "TARGET: RANK D")
- Failure screen should be atmospheric: "TRIAL FAILED — Return in 24 hours, Hunter." — in red/dark palette

</specifics>

<deferred>
## Deferred Ideas

- Shadow slot unlock on rank advance — requires Shadow Army Mechanics system (Phase 10)
- Stat penalty on trial failure (XP deduction) — discussed but decided against; kept for potential later difficulty tuning
- Time-limited trial variant — could be a "hardcore mode" option in a future phase

</deferred>

---

*Phase: 07-full-rank-trial-system*
*Context gathered: 2026-03-17*
