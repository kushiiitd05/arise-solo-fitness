# Phase 8: Dynamic Daily Quest Generation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the fixed 4-quest template (always push-ups, squats, sit-ups, cardio) with a generation engine that picks from a 7-type pool, adapts target difficulty based on recent completion history, and rotates types day-to-day. No new tabs, no story/emergency quests — daily tab only.

</domain>

<decisions>
## Implementation Decisions

### Quest Pool
- **7 exercise types** in the pool: push-ups, squats, sit-ups, cardio (existing 4) + burpees, plank, lunges (new 3)
- **Always 4 quests per day** — count stays fixed, types drawn from the pool
- All types are bodyweight/no-equipment — no pull-ups or equipment-dependent exercises

### Completion History Adaptation
- History drives **target difficulty only** — not which types appear (job class modifiers already handle type weighting)
- **3-day lookback** — engine reads the last 3 `daily_quests` rows for the user
- **±20% adjustment range**: fully completed all 3 days → +20% targets; completed none → −20%; partial completions scale linearly between
- **Fallback for new users / missing history**: pure level-based formula output (`generateDailyQuestTargets`) with no adjustment applied

### Rotation & Seeding
- **Date-seeded selection** — same 4 types for all hunters on a given calendar date (deterministic, reproducible, shared daily challenge)
- **Anti-repeat**: exclude the previous day's 4 quest types from today's selection pool; if fewer than 4 types remain after exclusion, allow re-inclusion of least-recently-seen types
- **Job class affects targets only** (via existing `JOB_CLASS_MODIFIERS`) — not which types appear

### QuestBoard UI
- **Daily tab only** — story and emergency tabs remain stubs; this phase does not touch them
- **Difficulty badge per quest card**: EASY / NORMAL / HARD label shown in the card corner
  - EASY: history adjustment < −10% (green `#10B981`)
  - NORMAL: adjustment −10% to +10% (cyan `#06B6D4`)
  - HARD: adjustment > +10% (red `#EF4444`)
- Badge maps to the per-quest difficulty after history + level calculation; not a global label

### Claude's Discretion
- Exact seeding implementation (date string hashed to numeric seed, Fisher-Yates shuffle, etc.)
- How history completion rate is computed (all_completed boolean vs per-quest completion ratio)
- Where the generation logic lives — extend `xpEngine.ts` or new `questEngine.ts`
- Whether difficulty badge is a chip above the quest name or an inline tag

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Quest generation (current implementation)
- `src/lib/game/xpEngine.ts` — `generateDailyQuestTargets(level, jobClass)`, `JOB_CLASS_MODIFIERS`, `HunterRank`; this is what Phase 8 replaces/extends
- `src/app/api/quests/daily/route.ts` — current POST generation route; Phase 8 updates this to call the new engine
- `src/lib/services/questService.ts` — `DailyQuestItem` interface, `generateDailyQuestsForUser` (client-side service — Phase 8 should route through server route, not this)

### Quest storage
- `supabase/migrations/20260311000000_init_schema.sql` — `daily_quests` table schema: `user_id`, `quest_date`, `quests` (JSONB), `all_completed`

### QuestBoard UI
- `src/components/arise/QuestBoard.tsx` — where difficulty badges will be added to quest cards

### Existing patterns to follow
- `src/lib/gameReducer.ts` — `GameState`, `UserStats` types
- `src/app/api/rank/advance/route.ts` — server route pattern: Bearer auth via local `getUserId()`, `supabaseServer`, no anon-client writes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `generateDailyQuestTargets(level, jobClass)` — returns 4 quest objects; Phase 8 wraps/replaces this with a new function that accepts history and returns any 4 from the 7-type pool
- `JOB_CLASS_MODIFIERS` — already maps job class → per-stat multipliers; reuse for target scaling after type selection
- `DailyQuestItem` interface — `{ id, name, icon, type, target, current, xp_reward, completed }`; new engine must return objects matching this shape (possibly extended with a `difficulty` field for the badge)
- `all_completed` column in `daily_quests` — can be used as a fast boolean for history lookup (avoids parsing per-quest progress)

### Established Patterns
- Server routes: local `getUserId()` copy, `supabaseServer`, no anon-client writes
- All hex colors: green `#10B981`, cyan `#06B6D4`, red `#EF4444`, purple `#7C3AED`, gold `#D97706`
- Quest generation triggered by POST `/api/quests/daily` — called once at session start if no row for today exists
- 3-day history lookup: query `daily_quests` where `user_id = X AND quest_date IN (today-1, today-2, today-3)`

### Integration Points
- `src/app/api/quests/daily/route.ts` POST handler — replace `generateDailyQuestTargets` call with new dynamic engine call
- `src/components/arise/QuestBoard.tsx` — add difficulty badge to each quest card in the daily tab render
- `DailyQuestItem` interface in `questService.ts` — may need a `difficulty?: 'EASY' | 'NORMAL' | 'HARD'` field added

</code_context>

<specifics>
## Specific Ideas

- Badge position: small chip in the top-right corner of each quest card — consistent with how intensity rank is displayed in WorkoutEngine
- The difficulty reflects the hunter's personal history — two hunters at the same level may see different targets (and badges) on the same day

</specifics>

<deferred>
## Deferred Ideas

- Story quest tab population — separate feature, own phase
- Emergency / time-limited quest system — could be dynamically generated too, own phase
- Job-class-weighted type selection (FIGHTER gets more strength quests) — deferred, targets-only weighting is sufficient for now
- Emergency quest as a penalty for missed days — interesting mechanic, out of scope here

</deferred>

---

*Phase: 08-dynamic-daily-quest-generation*
*Context gathered: 2026-03-17*
