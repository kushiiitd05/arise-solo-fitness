# Phase 12: Manhwa Chapter Reward System - Research

**Researched:** 2026-03-19
**Domain:** Chapter unlock gating, reward trigger plumbing, ceremony UI, session-init integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Unlock triggers**
- All daily quests completed → unlock 1 chapter (POST /api/quests/update all-quests-done path)
- Boss kill → also unlock 1 chapter (POST /api/boss/complete, same pattern as extraction_tokens)
- Two independent, additive unlock paths
- Increment is inline in existing routes — no dedicated /api/chapters/unlock route
- Unlock capped at total chapter count (4)

**Unlock feedback**
- Two-layer feedback: ADD_NOTIFICATION with type CHAPTER + full-screen ChapterUnlockCeremony
- Ceremony fires after server-side unlock is confirmed

**Chapter count & progression**
- 4 chapters — use existing 4 hardcoded entries from gameReducer initialState
- Sequential event-driven unlock — chapter N before N+1
- No level gate
- Chapter 1 starts unlocked (already in initialState)

**Reader vs external link**
- External link only — window.open(url, '_blank')
- Internal Reader.tsx NOT used in this phase
- Dashboard chapter click → open external URL directly (no SELECT_CHAPTER dispatch)
- Chapters with no valid URL: "Source not yet available" message

**DB persistence**
- New column: chapters_unlocked INT DEFAULT 1 on users table
- Represents count of sequentially unlocked chapters (e.g., 2 = chapters 1 and 2 unlocked)
- Server increments inline in POST /api/quests/update and POST /api/boss/complete
- Loaded in page.tsx session init — added to user row query, mapped into chapters GameState
- chapters_unlocked lives in GameState (not localStorage like extraction_tokens)

### Claude's Discretion
- Exact dismiss duration for CHAPTER notification type (suggest 6-7s — longer than QUEST=4s, shorter than LEVELUP=7s)
- Unlock ceremony visual design (use RankUpCeremony as template)
- Whether to cap increment to prevent double-unlock on same event type per day
- Exact ceremony copy and animation choices

### Deferred Ideas (OUT OF SCOPE)
- Internal Reader.tsx full integration
- More than 4 chapters
- Chapter-specific URLs for chapters 2-4 (blocked on confirmed links)
</user_constraints>

---

## Summary

Phase 12 wires chapter unlocks as gameplay rewards, following the same server-side increment pattern established by extraction_tokens in Phase 10. The data flow is: server route increments `chapters_unlocked` counter on users table → route response includes chapter unlock signal → client dispatches ADD_NOTIFICATION (CHAPTER type) + triggers ChapterUnlockCeremony overlay → Dashboard chapter list items get onClick handlers opening external URLs.

The code is largely scaffolded. gameReducer already has the `Chapter` interface, 4 hardcoded chapters in initialState (chapter 1 unlocked), UNLOCK_CHAPTER action, and CHAPTER notification type. SystemNotification already handles CHAPTER type (currently at 5s dismiss — Claude's discretion to raise to 6s). chapterService.ts has the CHAPTER_URL_MAP with valid URLs for chapters 0 and 1. Dashboard already renders the chapter list with locked/unlocked styling but has no click handler.

The primary work is: DB migration (one column), inline server-side increment in two existing routes, session-init mapping, Dashboard click handler, and a new ChapterUnlockCeremony component modeled on RankUpCeremony.

**Primary recommendation:** Follow the extraction_tokens pattern (Phase 10) exactly — read-then-write on users table, inline in routes, no dedicated service layer for the increment.

---

## Standard Stack

### Core — Already in Project
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | existing | ChapterUnlockCeremony animation | Already used in RankUpCeremony, PenaltyZone, all overlays |
| @supabase/supabase-js | existing | DB read-then-write in routes | supabaseServer (service-role) established for all route writes |
| Next.js route handlers | existing | POST /api/quests/update, POST /api/boss/complete | All mutations go through server routes |

### No New Dependencies
All libraries needed are already installed. Phase 12 adds no new npm packages.

---

## Architecture Patterns

### Pattern 1: Read-Then-Write Counter Increment (extraction_tokens model)

**What:** Server reads current counter, increments by 1, writes back. Supabase v2 has no raw() for atomic increment, so read-then-write is the established pattern.

**When to use:** Any time a counter on users table needs incrementing in a route.

**Exact pattern from /api/boss/complete/route.ts:**
```typescript
// Source: src/app/api/boss/complete/route.ts (Phase 10)
const { data: userRow, error: readErr } = await supabase
  .from("users")
  .select("extraction_tokens")
  .eq("id", userId)
  .maybeSingle();

if (readErr || !userRow) {
  return NextResponse.json({ error: "User not found" }, { status: 404 });
}

const current = userRow.extraction_tokens ?? 0;

const { error: updateErr } = await supabase
  .from("users")
  .update({ extraction_tokens: current + 1 })
  .eq("id", userId);
```

**For Phase 12:** Replace `extraction_tokens` with `chapters_unlocked`, add cap check: `Math.min(current + 1, 4)`.

### Pattern 2: Route Signals Chapter Unlock to Client

**What:** Route response includes `chaptersUnlocked: number` in JSON. Client code (BossEvent / QuestBoard / WorkoutEngine) checks this field, dispatches ADD_NOTIFICATION and triggers ceremony.

**Established precedent:** /api/quests/update returns `allCompleted`, `leveledUp`, `newLevel` — client checks these to trigger notifications. Same approach for chapter unlock.

**Route response shape to add:**
```typescript
// In both /api/boss/complete and /api/quests/update
return NextResponse.json({
  success: true,
  // ...existing fields...
  chapters_unlocked: newCount,   // new field — always present
  chapter_newly_unlocked: newCount > previousCount,  // boolean signal
});
```

### Pattern 3: wasAllCompleted Guard (double-trigger prevention)

**What:** /api/quests/update already uses `wasAllCompleted` to prevent double XP on repeat POSTs. Apply the same guard to chapter unlock in that route.

**Critical:** The `wasAllCompleted` snapshot is taken BEFORE the update. Chapter increment must only fire when `allCompleted && !wasAllCompleted`.

**From /api/quests/update/route.ts line 42:**
```typescript
// Capture before mutation — prevents double XP grant
const wasAllCompleted = row.all_completed;
// ...
if (allCompleted && !wasAllCompleted) {
  // chapter increment goes here, alongside XP grant
}
```

### Pattern 4: Session Init — Mapping chapters_unlocked to GameState.chapters

**What:** page.tsx loadUser fetches user row, mapDbUserToState converts snake_case to camelCase. chapters_unlocked must be added to the SELECT query and used to derive `chapters[]` unlocked states.

**Established precedent (extraction_tokens is NOT in session init — it's a Dashboard useState fetch):** But CONTEXT.md explicitly states chapters_unlocked lives in GameState, not localStorage/local useState. So it maps through page.tsx SET_DATA dispatch.

**Mapping logic:**
```typescript
// In syncSession, after mapDbUserToState:
const chaptersUnlocked = dbData.user.chapters_unlocked ?? 1;
const mappedChapters = initialState.chapters.map((ch, idx) => ({
  ...ch,
  unlocked: idx < chaptersUnlocked,
}));
dispatch({ type: "SET_DATA", payload: { chapters: mappedChapters } });
```

Note: chapters array uses 0-based index; `chapters_unlocked` is a count (1 = only index 0 unlocked). So `idx < chaptersUnlocked` is correct.

### Pattern 5: ChapterUnlockCeremony Component

**What:** Full-screen overlay, same structure as RankUpCeremony. Fires dispatch(ADD_NOTIFICATION) in useEffect on mount. Has onDismiss prop.

**RankUpCeremony structure to replicate:**
- `fixed inset-0 z-[200]` overlay
- framer-motion initial/animate/transition
- Fires ADD_NOTIFICATION from useEffect once on mount
- onDismiss button (no auto-dismiss — user must tap)
- Accepts dispatch prop for the notification

**Props interface:**
```typescript
interface ChapterUnlockCeremonyProps {
  chapterTitle: string;
  chapterNumber: number;
  chapterRarity: string;
  onDismiss: () => void;
  dispatch: React.Dispatch<any>;
}
```

**Color theme:** Use cyan (#06B6D4) — matches SYSTEM_LOGS panel in Dashboard that houses the chapter list. RankUpCeremony uses gold (#D97706) for rank. Chapter ceremony should use cyan to differentiate.

### Pattern 6: Dashboard Chapter Click Handler

**What:** Replace static chapter list items with clickable ones. Unlocked chapters with a valid externalUrl call `window.open(url, '_blank')`. No external URL → show "Source not yet available" toast via ADD_NOTIFICATION.

**Current Dashboard chapter rendering (lines 333-345):**
```tsx
// chapters slice, locked/unlocked styling — no onClick yet
<div key={ch.id} className={cn("p-5 rounded-2xl border flex items-center ...",
  ch.unlocked ? "border-white/10 ... cursor-pointer" : "border-white/5 opacity-20 grayscale")}>
```

**Change:** Add `onClick` to the unlocked variant:
```tsx
onClick={() => {
  if (!ch.unlocked) return;
  if (ch.externalUrl) {
    window.open(ch.externalUrl, '_blank');
  } else {
    dispatch({ type: "ADD_NOTIFICATION", payload: {
      type: "CHAPTER",
      title: "SOURCE NOT AVAILABLE",
      body: `${ch.title} — external source not yet confirmed.`,
      icon: "📖",
    }});
  }
}}
```

### Recommended Component & File Touchpoints

```
src/
├── app/api/boss/complete/route.ts         -- add chapters_unlocked read/increment
├── app/api/quests/update/route.ts         -- add chapters_unlocked read/increment (inside allCompleted guard)
├── app/page.tsx                           -- add chapters_unlocked to user row SELECT, map to GameState.chapters
├── components/arise/Dashboard.tsx         -- add chapter onClick handler, wire ChapterUnlockCeremony state
├── components/arise/ChapterUnlockCeremony.tsx  -- NEW: full-screen overlay
└── supabase/migrations/20260319_chapters_unlocked.sql  -- new migration
```

### Anti-Patterns to Avoid

- **Do NOT use a dedicated /api/chapters/unlock route.** Increment is inline in existing routes per CONTEXT.md decision.
- **Do NOT dispatch SELECT_CHAPTER.** External URL opens directly; activeChapterId remains unused in this phase.
- **Do NOT read chapters_unlocked in Dashboard local useState (like extraction_tokens).** chapters_unlocked is GameState — loaded via session init in page.tsx.
- **Do NOT generate URLs for chapters 2-4.** The getChapterUrl fallback in chapterService.ts pattern-generates URLs that may be invalid. For chapters without a confirmed URL, show "Source not yet available".
- **Do NOT apply the chapter increment outside the wasAllCompleted guard in /api/quests/update.** The guard already exists; chapter increment is added inside the same `if (allCompleted && !wasAllCompleted)` block.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotent counter increment | Custom locking mechanism | Read-then-write + cap check | Supabase v2 has no atomic increment; read-then-write is established (extraction_tokens) |
| Full-screen overlay animation | Custom CSS transitions | framer-motion (already installed) | Consistent with all other overlays; RankUpCeremony is the direct template |
| Notification display | New notification component | Existing SystemNotification + ADD_NOTIFICATION dispatch | CHAPTER type already defined and handled with 5s auto-dismiss |
| GameState update after ceremony | Complex state sync | SET_DATA dispatch with derived chapters array | Existing reducer handles chapters[] state; UNLOCK_CHAPTER action available if needed |

---

## Common Pitfalls

### Pitfall 1: chapterService.ts URL Fallback Generates Invalid URLs
**What goes wrong:** `getChapterUrl(chapterNumber)` falls back to pattern-generating `https://comix.to/.../chapter-${i}` for any unmapped chapter. These URLs are unconfirmed and may 404.
**Why it happens:** chapterService.ts line 39 has this fallback. The Dashboard also has webtoons.com URLs in initialState that are not chapter-specific.
**How to avoid:** The click handler must check `ch.externalUrl` AND verify it is a known-valid URL (chapters 0 and 1 via CHAPTER_URL_MAP). For any chapter index >= 2, show "Source not yet available" regardless of what URL is in state — OR check that the URL does not contain the pattern-generated fallback format.
**Warning signs:** Chapters 2-4 having externalUrl in initialState (webtoons.com list page, not a specific chapter).

### Pitfall 2: Double Chapter Unlock on Boss Kill
**What goes wrong:** awardRaidReward in bossService.ts calls POST /api/boss/complete via fetch. If the victory screen button is tapped multiple times, multiple POSTs fire.
**Why it happens:** BossEvent showVictory state does not prevent re-tapping the reward button before it dismisses.
**How to avoid:** The route increment already caps at 4. Optionally add a loading state in BossEvent during the boss/complete fetch, or accept the cap as the idempotency mechanism.

### Pitfall 3: Session Init SELECT Missing chapters_unlocked
**What goes wrong:** page.tsx loadUser calls `supabase.from("users").select(...)` — if `chapters_unlocked` is not in the select list, it returns undefined and the mapping defaults to 1.
**Why it happens:** loadUser in userService.ts has a fixed select string. The column must be added to it.
**How to avoid:** Check the SELECT string in userService.ts (or wherever the user row is fetched in page.tsx syncSession). Add `chapters_unlocked` to the field list.

### Pitfall 4: initialState chapters Use 1-Based IDs, But Index is 0-Based
**What goes wrong:** Chapters in gameReducer initialState have `id: "1"`, `id: "2"`, `id: "3"`, `id: "4"`. But `chapters_unlocked: 1` means "1 chapter is unlocked" (chapter at index 0). Off-by-one if you use `ch.id` as a number vs array index.
**Why it happens:** IDs are strings "1"-"4", not "0"-"3". The CONTEXT.md states "Chapter 1 starts unlocked" but the id is "1" (index 0 in the array).
**How to avoid:** Use array index in the mapping, not ch.id: `chapters.map((ch, idx) => ({ ...ch, unlocked: idx < chaptersUnlocked }))`. Do not parse ch.id as a number.

### Pitfall 5: ChapterUnlockCeremony Triggering Without Knowing Which Chapter
**What goes wrong:** The route returns `chapters_unlocked: 3` but the client needs to know the specific chapter that was just unlocked (title, rarity) to display in the ceremony.
**Why it happens:** The counter tells you the new total, not the chapter details.
**How to avoid:** Client derives `justUnlockedChapter = state.chapters[newCount - 1]` after the SET_DATA dispatch updates chapters. The ceremony component receives `chapterTitle`, `chapterRarity` derived from this lookup.

### Pitfall 6: CHAPTER Notification Dismiss Duration
**What goes wrong:** SystemNotification DISMISS_DURATIONS currently has `CHAPTER: 5000`. CONTEXT.md says Claude's discretion is 6-7s.
**Why it happens:** The value was set as a placeholder in Phase 5.
**How to avoid:** Plan should explicitly update this constant to 6000ms.

---

## Code Examples

### Migration: Add chapters_unlocked Column
```sql
-- supabase/migrations/20260319_chapters_unlocked.sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "chapters_unlocked" INTEGER NOT NULL DEFAULT 1;
```
Note: DEFAULT 1 ensures all existing users have Chapter 1 accessible (matching initialState).

### Boss Complete Route — Chapters Increment (inline, after existing token increment)
```typescript
// Source pattern: src/app/api/boss/complete/route.ts (Phase 10)
// Read chapters_unlocked alongside extraction_tokens in the same select:
const { data: userRow, error: readErr } = await supabase
  .from("users")
  .select("extraction_tokens, chapters_unlocked")
  .eq("id", userId)
  .maybeSingle();

const currentTokens = userRow.extraction_tokens ?? 0;
const currentChapters = userRow.chapters_unlocked ?? 1;
const newChapters = Math.min(currentChapters + 1, 4);
const chapterUnlocked = newChapters > currentChapters;

await supabase
  .from("users")
  .update({
    extraction_tokens: currentTokens + 1,
    chapters_unlocked: newChapters,
  })
  .eq("id", userId);

return NextResponse.json({
  success: true,
  extraction_tokens: currentTokens + 1,
  chapters_unlocked: newChapters,
  chapter_newly_unlocked: chapterUnlocked,
});
```

### Quests Update Route — Chapters Increment (inside allCompleted guard)
```typescript
// Source pattern: src/app/api/quests/update/route.ts (Phase 3/8)
// Inside if (allCompleted && !wasAllCompleted) block:
const { data: chapterRow } = await supabase
  .from("users")
  .select("chapters_unlocked")
  .eq("id", userId)
  .maybeSingle();

const currentChapters = chapterRow?.chapters_unlocked ?? 1;
const newChapters = Math.min(currentChapters + 1, 4);
const chapterUnlocked = newChapters > currentChapters;

await supabase
  .from("users")
  .update({ chapters_unlocked: newChapters })
  .eq("id", userId);

// Add to return JSON:
// chapters_unlocked: newChapters,
// chapter_newly_unlocked: chapterUnlocked,
```

### page.tsx Session Init — Map chapters_unlocked
```typescript
// After mapDbUserToState, inside the dbData.user block:
const chaptersUnlocked = dbData.user.chapters_unlocked ?? 1;
const mappedChapters = initialState.chapters.map((ch, idx) => ({
  ...ch,
  unlocked: idx < chaptersUnlocked,
}));
dispatch({ type: "SET_DATA", payload: { chapters: mappedChapters } });
```

### ChapterUnlockCeremony — Component Skeleton
```typescript
// src/components/arise/ChapterUnlockCeremony.tsx
// Structure mirrors RankUpCeremony.tsx exactly
// Key differences:
// - No oldRank/newRank props; instead chapterTitle + chapterRarity
// - Cyan color (#06B6D4) instead of gold (#D97706) for accent
// - Simpler layout: book icon, chapter title badge, rarity pill, dismiss button
// - ADD_NOTIFICATION with type "CHAPTER" fired in useEffect on mount
// - z-[200] fixed overlay, bg-[#030308]
```

### Dashboard — Ceremony State (parallel to showRankUp/rankUpResult)
```typescript
// In Dashboard component body, alongside existing ceremony state:
const [showChapterUnlock, setShowChapterUnlock] = useState(false);
const [unlockedChapterData, setUnlockedChapterData] = useState<{
  title: string; rarity: string; number: number;
} | null>(null);

// In AnimatePresence block alongside RankUpCeremony:
{showChapterUnlock && unlockedChapterData && (
  <ChapterUnlockCeremony
    chapterTitle={unlockedChapterData.title}
    chapterNumber={unlockedChapterData.number}
    chapterRarity={unlockedChapterData.rarity}
    dispatch={dispatch}
    onDismiss={() => {
      setShowChapterUnlock(false);
      setUnlockedChapterData(null);
    }}
  />
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chapterService getUserChapters (level-gated, no DB) | chapters_unlocked counter on users table | Phase 12 | Chapters become event-gated, persisted, session-loaded |
| No chapter click handler in Dashboard | window.open(url, '_blank') on unlocked chapters | Phase 12 | Chapters become interactive external links |
| CHAPTER notification at 5s (Phase 5 placeholder) | Raised to 6s per Phase 12 | Phase 12 | More time to read chapter unlock message |

**Deprecated/outdated:**
- `getUserChapters()` in chapterService.ts: Level-based generation is now superseded. The function can remain but is no longer the source of truth. GameState.chapters (loaded from DB counter) is authoritative.
- `unlockNextChapter()` in chapterService.ts: Stub that returns success without doing anything. Not used in this phase — increment is inline in routes.
- `getChapterUrl()` fallback pattern-generation: Chapters 2+ have no confirmed valid URL. Dashboard click handler must not call getChapterUrl() for unconfirmed chapters.

---

## Open Questions

1. **Where does the ceremony trigger live — BossEvent or Dashboard?**
   - What we know: RankUpCeremony is triggered from Dashboard (via onTrialPass callback from RankTrialEngine). BossEvent dispatches ADD_NOTIFICATION directly but does not trigger a full-screen ceremony.
   - What's unclear: Should BossEvent call a callback prop to Dashboard to trigger ChapterUnlockCeremony, or should BossEvent directly set a local state that conditionally renders the ceremony?
   - Recommendation: Follow the RankUpCeremony pattern — BossEvent calls an `onChapterUnlocked` callback prop on Dashboard; Dashboard owns the ceremony state. This keeps ceremony rendering in one place (Dashboard AnimatePresence block).

2. **Does /api/quests/update need a second DB fetch for chapters_unlocked?**
   - What we know: The route already does 3-4 DB reads (daily_quests, user, user_stats x2). Adding one more select of `chapters_unlocked` from users is an extra round-trip.
   - What's unclear: Could chapters_unlocked be read in the existing user fetch inside the `allCompleted` guard?
   - Recommendation: Yes — expand the existing `select("current_xp, level")` inside the guard to `select("current_xp, level, chapters_unlocked")`. One fetch, not two.

3. **loadUser in userService.ts — does it select all columns or named columns?**
   - What we know: page.tsx calls `loadUser(session.user.id)` which is in userService.ts. This file was NOT read during research.
   - What's unclear: If loadUser uses `select("*")` the new column auto-appears. If it uses a named list, `chapters_unlocked` must be added.
   - Recommendation: Planner should read userService.ts in Plan 12-01 and verify.

---

## Validation Architecture

> config.json has no `workflow.nyquist_validation` key — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (installed Phase 6) |
| Config file | vitest.config.ts or package.json scripts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| ID | Behavior | Test Type | Automated Command | File Exists? |
|----|----------|-----------|-------------------|-------------|
| CH-01 | chapters_unlocked increments on boss kill, capped at 4 | unit | `npx vitest run src/__tests__/chapterUnlock.test.ts` | ❌ Wave 0 |
| CH-02 | chapters_unlocked increments on all-quests-done, only once per transition | unit | `npx vitest run src/__tests__/chapterUnlock.test.ts` | ❌ Wave 0 |
| CH-03 | Session init maps chapters_unlocked to chapters[] correctly | unit | `npx vitest run src/__tests__/chapterMapping.test.ts` | ❌ Wave 0 |
| CH-04 | Dashboard chapter click opens external URL for unlocked chapters | manual-only | n/a — window.open cannot be tested in vitest unit | manual |
| CH-05 | Locked chapters show no-op on click | manual-only | n/a — UI interaction | manual |

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/chapterUnlock.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/chapterUnlock.test.ts` — covers CH-01, CH-02 (route logic unit tests with supabase mock)
- [ ] `src/__tests__/chapterMapping.test.ts` — covers CH-03 (session init mapping pure function)
- [ ] Supabase mock pattern: follow bossService.test.ts `vi.mock` approach established in Phase 6

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `src/app/api/boss/complete/route.ts` — exact extraction_tokens increment pattern
- Direct code read: `src/app/api/quests/update/route.ts` — wasAllCompleted guard, DB read pattern
- Direct code read: `src/app/page.tsx` — session init shape, mapDbUserToState, SET_DATA dispatch
- Direct code read: `src/lib/gameReducer.ts` — Chapter interface, initialState.chapters (4 entries, ch1 unlocked), UNLOCK_CHAPTER, CHAPTER notification type
- Direct code read: `src/components/arise/Dashboard.tsx` — chapter list rendering, ceremony state pattern (showRankUp)
- Direct code read: `src/components/arise/RankUpCeremony.tsx` — full-screen ceremony template
- Direct code read: `src/components/system/SystemNotification.tsx` — DISMISS_DURATIONS (CHAPTER=5000, LEVELUP=7000)
- Direct code read: `src/lib/services/chapterService.ts` — CHAPTER_URL_MAP (only 0 and 1 valid)
- Direct code read: `supabase/migrations/20260318000000_extraction_tokens.sql` — ALTER TABLE column-add pattern
- Direct code read: `supabase/migrations/20260311000000_init_schema.sql` — users table schema (no chapters_unlocked yet)

### Secondary (MEDIUM confidence)
- .planning/STATE.md decisions block — Phase 10 extraction_tokens pattern, Phase 7 RankUpCeremony pattern

### Tertiary (LOW confidence)
- None — all findings verified directly from source code.

---

## Metadata

**Confidence breakdown:**
- DB migration: HIGH — extraction_tokens migration is the exact template
- Route increment pattern: HIGH — read directly from boss/complete/route.ts
- Session init mapping: HIGH — read directly from page.tsx
- Ceremony component structure: HIGH — read directly from RankUpCeremony.tsx
- Dashboard click handler: HIGH — current chapter rendering read, onClick is the gap
- URL validity for chapters 2-4: HIGH (confirmed invalid) — chapterService CHAPTER_URL_MAP only has 0 and 1; initialState has webtoons list URL (not chapter-specific)

**Research date:** 2026-03-19
**Valid until:** 2026-04-18 (stable project, no external library churn expected)
