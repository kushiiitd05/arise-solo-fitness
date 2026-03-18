# Phase 12: Manhwa Chapter Reward System - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Unlock manhwa chapters as rewards for gameplay events (daily quest completion and boss kills). Wire chapter unlock into existing quest/boss routes, persist unlock count to DB, and surface unlocked chapters as external links in Dashboard. Reader.tsx is NOT re-enabled — chapters open external URLs. Full-screen unlock ceremony on chapter earn.

</domain>

<decisions>
## Implementation Decisions

### Unlock triggers
- **All daily quests completed** → unlock 1 chapter (checked in POST /api/quests/update all-quests-done path)
- **Boss kill** → also unlock 1 chapter (checked in POST /api/boss/complete, same pattern as extraction tokens)
- Two independent unlock paths — additive, either event can unlock the next chapter
- Increment is inline in the existing routes, not a dedicated /api/chapters/unlock route
- Unlock is capped at total chapter count (cannot unlock beyond the 4 defined chapters)

### Unlock feedback
- Two-layer feedback:
  1. `ADD_NOTIFICATION` with type `CHAPTER` — "CHAPTER UNLOCKED: [Title]" — auto-dismiss (CHAPTER type already defined in gameReducer)
  2. Full-screen unlock ceremony component (similar to RankUpCeremony) — dramatic overlay before returning to Dashboard
- Ceremony fires after the unlock is confirmed server-side

### Chapter count & progression
- **4 chapters** — keep the existing 4 hardcoded entries from gameReducer initialState
- Progression: purely event-driven sequential unlock — chapter N must be earned before N+1 appears unlocked
- No level gate — completion events are the only gate
- Chapter 1 starts unlocked (already in initialState: `unlocked: true`)
- Chapters 2, 3, 4 start locked

### Reader vs external link
- **External link only** — tapping an unlocked chapter opens the external URL in a new tab (`window.open(url, '_blank')`)
- Internal `Reader.tsx` is NOT used in this phase
- `CHAPTER_URL_MAP` in chapterService has valid URLs for chapters 0 and 1 (comix.to)
- Chapters with no valid URL: show "Source not yet available" message even if the chapter is unlocked by gameplay
- Dashboard chapter click handler dispatches no `SELECT_CHAPTER` — instead directly opens external URL

### DB persistence
- New column `chapters_unlocked INT DEFAULT 1` on users table
- Represents how many chapters are sequentially unlocked (e.g., 2 = chapters 1 and 2 unlocked)
- Server increments `chapters_unlocked` inline in POST /api/quests/update and POST /api/boss/complete
- Loaded during session init in page.tsx — added to the user row query, mapped into gameReducer chapters state (first N chapters marked `unlocked: true`)
- `chapters_unlocked` lives in GameState (not localStorage like extraction_tokens) because it's session-persistent

### Claude's Discretion
- Exact dismiss duration for CHAPTER notification type (suggest 6-7s — longer than QUEST=4s, shorter than LEVELUP=7s)
- Unlock ceremony visual design (use RankUpCeremony as template, swap for chapter-themed content)
- Whether to cap increment to prevent double-unlock on same event type per day (or trust DB idempotency)
- Exact ceremony copy and animation choices

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Chapter system — existing code
- `src/lib/services/chapterService.ts` — Chapter type, CHAPTER_URL_MAP (only 0 and 1 mapped), getUserChapters stub
- `src/lib/gameReducer.ts` — Chapter interface (id, title, unlocked, rarity, externalUrl), initialState chapters array (4 hardcoded), SELECT_CHAPTER / UNLOCK_CHAPTER / CLOSE_READER actions, CHAPTER notification type
- `src/components/arise/Dashboard.tsx` — Chapter list render (chapters.slice(0, 5), locked/unlocked styling, no click handler yet)
- `src/components/arise/Reader.tsx` — Internal reader (NOT used in this phase, kept for future)

### Routes to modify (unlock inline)
- `src/app/api/quests/update/route.ts` — All-quests-done path → add chapters_unlocked increment here
- `src/app/api/boss/complete/route.ts` — Boss kill → add chapters_unlocked increment here (same file that increments extraction_tokens)

### Ceremony reference
- `src/components/arise/RankUpCeremony` (if exists) — Reference for full-screen unlock ceremony pattern

### Session init
- `src/app/page.tsx` — Session init pattern: user row fetch, stat merge, dispatch SET_DATA — add chapters_unlocked mapping here

### DB schema
- `supabase/migrations/20260311000000_init_schema.sql` — users table (add chapters_unlocked column)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `gameReducer CHAPTER notification type` — Already defined, needs a dismiss duration added (similar to QUEST=4s, LEVELUP=7s)
- `gameReducer UNLOCK_CHAPTER action` — Already implemented: maps over chapters and sets `unlocked: true` for matching id
- `gameReducer SELECT_CHAPTER / CLOSE_READER` — Can remain unused since we're going external-link, but keep for future phases
- `RankUpCeremony` pattern — Use as structural template for ChapterUnlockCeremony component
- `extraction_tokens` pattern (Phase 10) — Most analogous pattern: server increments counter in existing route, loaded in session init as local/game state

### Established Patterns
- `chapters_unlocked` incremented server-side inline in route (same as extraction_tokens in POST /api/boss/complete)
- Copy getUserId() locally in any new route logic (Phase 3 copy-don't-import rule)
- supabaseServer (service-role) for all DB writes
- ADD_NOTIFICATION dispatched from route response → client handles ceremony trigger
- IIFE pattern for derived computations in JSX

### Integration Points
- `POST /api/quests/update` (all-quests-done path) → increment `chapters_unlocked` on users table
- `POST /api/boss/complete` → increment `chapters_unlocked` on users table
- `page.tsx` session init → read `chapters_unlocked`, derive which chapters are unlocked, set in GameState
- Dashboard chapter list items → add `onClick` that opens `ch.externalUrl` in new tab (if URL exists) or shows "not yet available" toast
- New `ChapterUnlockCeremony` component → rendered in `page.tsx` when chapter unlock event fires (parallel to how RankUpCeremony renders)

</code_context>

<specifics>
## Specific Ideas

- External URLs follow comix.to pattern. Only chapters 0 and 1 have confirmed valid URLs — do not guess or pattern-generate URLs for chapters 2+ without confirming they work
- "Source not yet available" fallback: chapters can be "earned" (gameplay unlocked) but not "readable" until a valid URL is confirmed
- chapters_unlocked counter means: all chapters with index < chapters_unlocked are unlocked. Chapter 1 is always unlocked (DEFAULT 1).

</specifics>

<deferred>
## Deferred Ideas

- Internal Reader.tsx full integration (real manhwa image panels, not generated) — future phase
- More than 4 chapters — would need confirmed external URLs before expanding
- Chapter-specific URLs for chapters 2-4 — blocked on finding valid comix.to/webtoons links

</deferred>

---

*Phase: 12-manhwa-chapter-reward-system*
*Context gathered: 2026-03-19*
