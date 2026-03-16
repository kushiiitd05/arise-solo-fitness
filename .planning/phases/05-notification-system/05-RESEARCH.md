# Phase 5: Notification System - Research

**Researched:** 2026-03-16
**Domain:** React useReducer notification system, Framer Motion AnimatePresence, client-side event wiring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dismiss fix:**
- `DISMISS_NOTIFICATION` reducer must **remove from array** by id (filter out) — NOT mark `read: true`
- Current broken behavior: `.map(n => n.id === id ? { ...n, read: true } : n)` — must become `.filter(n => n.id !== action.payload)`
- `SystemNotification` already uses `AnimatePresence` — exit animation works automatically once item is removed from array

**Auto-dismiss timeouts (per notification type):**
- QUEST / WORKOUT notifications: 4–5 seconds
- REWARD notifications (items, gold): 5 seconds
- LEVEL UP / ARENA UNLOCK: 7–8 seconds
- URGENT system alerts: persist until manually dismissed (no auto-dismiss timer)
- `NotifItem` useEffect timeout must use type-based duration, not a fixed 6000ms

**Queue behavior:**
- Maximum 3 visible notifications at once
- Additional notifications queue in state; each time a visible notification dismisses, the next queued one slides in (FIFO)
- Queue implementation: `SystemNotification` renders only the first 3 from the array; the rest are "pending" and surface as slots open
- URGENT notifications occupy a normal slot (no special out-of-queue treatment)

**Unwired event triggers to add:**

| Event | Trigger location | Notification |
|-------|-----------------|-------------|
| Individual quest complete | Quest update client-side (after API response confirms completion) | Type: QUEST, Title: `[QUEST NAME] COMPLETE`, Body: `+[XP] XP Earned`, 4s |
| All daily quests complete | Same location, after last quest completes | Type: QUEST, Title: `DAILY QUESTS COMPLETE`, Body: `All missions accomplished. Full XP awarded.`, 5s |
| Rank advancement | gameReducer GAIN_XP case or level-up handler, when rank changes | Type: LEVELUP, Title: `RANK ADVANCEMENT`, Body: `Hunter rank advanced to Rank [RANK]`, 7s, cyan border |

- **Stat allocation:** NO notification — too noisy for interactive stat spend
- Quest name in per-quest notification should use the quest's actual name/label from the quest object

**Manual dismiss UX:**
- X button on URGENT notifications: dispatches `DISMISS_NOTIFICATION` immediately — same as clicking the notification body
- Click-to-dismiss (already implemented): keep as-is
- No "clear all" button — max 3 visible makes individual dismiss sufficient

### Claude's Discretion
- Exact queue data structure (whether to use a separate `notificationQueue` array in state, or slice the existing `notifications` array in the renderer)
- Progress bar animation duration must match per-type timeout (currently hardcoded to 6s in `motion.div`)
- Whether rank detection for rank-up notification lives in reducer or a useEffect in Dashboard/page.tsx

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 5 is a targeted bug-fix and event-wiring phase on an already-built notification system. The infrastructure — `SystemNotification.tsx`, the `Notification` interface in `gameReducer.ts`, `ADD_NOTIFICATION` and `DISMISS_NOTIFICATION` reducer cases, and Framer Motion `AnimatePresence` — is fully in place. The system is broken in exactly one place in the reducer (mark-read instead of filter-out) and two places in the component (fixed 6000ms timeout, no render cap). No new architecture is needed.

The event-wiring work (quest completion, rank-up notifications) requires understanding exactly where quest completion is detected. The `POST /api/quests/update` route is called from `WorkoutEngine.tsx`, and it returns `{ allCompleted, quests, leveledUp, newLevel, newRank }` in the response. This response is currently ignored after the fetch call — the dispatch points need to read this response and fire `ADD_NOTIFICATION` calls. The `WorkoutEngine` is the right place for both per-quest and all-complete notifications, not `Dashboard.tsx` as suggested in CONTEXT — the API call lives there and the response data is available.

For rank-up notifications, `gameReducer.ts` already detects rank changes in `COMPLETE_WORKOUT` / `ADD_XP` cases (line 252: `const rankChanged = rank !== state.user.rank`) and currently creates a level-up notification with title `RANK UP! E -> D`. This needs to be updated to match the CONTEXT.md copy contract (`RANK ADVANCEMENT` / `Hunter rank advanced to Rank [RANK]`). The Dashboard's `prevRankRef` useEffect at line 54–70 also dispatches a notification on rank change — this creates a duplicate. The planner must resolve this overlap.

**Primary recommendation:** Three surgical edits to two files (reducer + component), plus one event-wiring point in `WorkoutEngine.tsx` for quest notifications, plus deduplication of rank-up notification between gameReducer and Dashboard useEffect.

---

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| framer-motion | already installed | AnimatePresence, motion.div exit animations | Already wraps notification list |
| lucide-react | already installed | Bell, Zap, Ghost, AlertTriangle, X icons | Already imported in SystemNotification.tsx |
| clsx + tailwind-merge | already installed | cn() utility for conditional classes | Already in SystemNotification.tsx |

**No new packages required for this phase.**

---

## Architecture Patterns

### Recommended Project Structure
No structural changes. All modifications are within existing files:

```
src/
├── lib/
│   └── gameReducer.ts          # Fix DISMISS_NOTIFICATION case (line 314)
├── components/system/
│   └── SystemNotification.tsx  # Fix NotifItem timeout + render cap
└── components/arise/
    └── WorkoutEngine.tsx        # Add notification dispatches after quest update API call
```

### Pattern 1: Reducer Fix — Filter vs Mark-Read

**What:** `DISMISS_NOTIFICATION` must remove items from array, not mutate `read` flag.

**Current broken code (gameReducer.ts line 313–314):**
```typescript
case "DISMISS_NOTIFICATION":
  return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
```

**Fixed code:**
```typescript
case "DISMISS_NOTIFICATION":
  return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
```

**Why this fixes exit animation:** `AnimatePresence` in `SystemNotification.tsx` tracks items by `key={n.id}`. When an item is removed from the array, React unmounts it, triggering the `exit` variant in the `motion.div`. With mark-read, the item stays in the array with `read: true`, so it never unmounts, so the exit animation never fires.

### Pattern 2: Per-Type Auto-Dismiss Duration

**What:** `NotifItem` useEffect must calculate timeout from notification type, not use hardcoded 6000ms. URGENT type gets no timeout at all.

**Type-to-duration lookup (Claude's discretion — recommended):**
```typescript
const DISMISS_DURATION: Record<string, number> = {
  QUEST:    4000,
  WORKOUT:  4500,
  SHADOW:   5000,
  CHAPTER:  5000,
  REWARD:   5000,
  INFO:     5000,
  PVP:      5000,
  SYSTEM:   5000,
  LEVELUP:  7000,
};

// In NotifItem useEffect:
useEffect(() => {
  if (n.type === "URGENT" || n.title.includes("URGENT") || n.title.includes("PENALTY")) return;
  const duration = DISMISS_DURATION[n.type] ?? 5000;
  const t = setTimeout(() => onDismiss(n.id), duration);
  return () => clearTimeout(t);
}, [n.id, n.type, onDismiss]);
```

**Progress bar duration must match:**
```tsx
// Current (broken): transition={{ duration: 6, ease: "linear" }}
// Fixed: pass duration as prop or derive same way
<motion.div
  initial={{ scaleX: 1 }}
  animate={{ scaleX: 0 }}
  transition={{ duration: duration / 1000, ease: "linear" }}
  ...
/>
```

Since both the `useEffect` timeout and the `motion.div` duration need the same value, compute `duration` once at the top of `NotifItem` and use it in both places.

### Pattern 3: Queue Cap — Render Slice

**What:** `SystemNotification` renders only the first 3 notifications. Items 4+ stay in the reducer array (queued) and slide in as slots open.

**Current:**
```tsx
{notifications.map((n) => (
  <NotifItem key={n.id} n={n} onDismiss={onDismiss} />
))}
```

**Fixed (simplest approach — Claude's discretion recommends this):**
```tsx
{notifications.slice(0, 3).map((n) => (
  <NotifItem key={n.id} n={n} onDismiss={onDismiss} />
))}
```

**Why this works with FIFO:** `ADD_NOTIFICATION` prepends to the front of the array (`[newItem, ...state.notifications]`). When the rendered cap is slice(0, 3), the most recent 3 items are visible. When one dismisses via filter, the array shrinks and the 4th-oldest (next in line) enters the rendered slice automatically. AnimatePresence handles the enter animation.

**Important caveat:** The current `ADD_NOTIFICATION` reducer PREPENDS new items. This means newest-first display. The slice(0, 3) approach shows the 3 most-recently-added notifications. If FIFO is strictly required (oldest visible first), the array order must be append-not-prepend, or the slice must use `.slice(-3)`. Recommend keeping the current prepend behavior (newest visible) as it matches the UI intent.

### Pattern 4: Quest Completion Notification Dispatch

**What:** After `fetch('/api/quests/update')` resolves, parse the response and dispatch notifications.

**Where:** `WorkoutEngine.tsx`, inside the quest update loop (after the `await fetch(...)` call at line 162–169).

**Critical discovery:** The API response at `/api/quests/update` already returns `{ allCompleted, quests, leveledUp, newLevel, newRank, questId }`. The caller currently ignores this response. The notification dispatch must read the response JSON.

**Pattern:**
```typescript
const res = await fetch("/api/quests/update", { ... });
const result = await res.json();

// Per-quest completion notification
if (result.success) {
  const completedQuest = (result.quests as any[]).find((q: any) => q.id === questId && q.completed);
  const wasAlreadyComplete = /* the quest's completed state before this call */;
  if (completedQuest && !wasAlreadyComplete) {
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "QUEST",
        title: `${completedQuest.name} COMPLETE`,
        body: `+${completedQuest.xp_reward ?? completedQuest.xp ?? 0} XP Earned`,
        icon: "✅",
      },
    });
  }
  // All-complete notification
  if (result.allCompleted) {
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "QUEST",
        title: "DAILY QUESTS COMPLETE",
        body: "All missions accomplished. Full XP awarded.",
        icon: "🏆",
      },
    });
  }
}
```

**Guard against double all-complete:** The API route already uses `wasAllCompleted` guard server-side to prevent double XP. The client must also guard against dispatching `DAILY QUESTS COMPLETE` if the quests were already all complete before this call. The cleanest way: check the quest's `completed` state in `questsData` (fetched before the loop) before calling the update, and only dispatch if `!q.completed` was true when we started.

### Pattern 5: Rank-Up Notification — Deduplication Problem

**Critical finding:** Two separate places currently dispatch rank-up notifications:

1. **`gameReducer.ts` line 263–268** — Inside `COMPLETE_WORKOUT`/`ADD_XP` case, when `level > state.user.level`: creates a `LEVELUP` type notification with title `RANK UP! E -> D` if `rankChanged` is true.

2. **`Dashboard.tsx` line 54–70** — `useEffect` watching `rank`, fires when rank changes from "E" to something else, dispatches `SYSTEM` type notification `COMBAT AUTHORIZATION GRANTED`.

These fire independently. After Phase 4, the Dashboard useEffect fires for Arena unlock specifically (E→D). The gameReducer fires for ALL rank changes including level-up.

**Resolution options:**
- **Option A (recommended):** Update the `gameReducer.ts` notification to use the correct copy (`RANK ADVANCEMENT` / `Hunter rank advanced to Rank [RANK]`, type `LEVELUP`) and remove or suppress the duplicate from Dashboard. The Dashboard useEffect can remain for `arenaJustUnlocked` state management (the flash banner) but should NOT dispatch a second notification.
- **Option B:** Keep both but differentiate — gameReducer handles rank-up notification, Dashboard handles arena unlock UI state only (no notification dispatch).

Option A is cleaner and aligns with the CONTEXT decision that rank-up notification lives in the reducer.

### Anti-Patterns to Avoid

- **Do not use `n.read` to hide notifications in the render.** The current system has `read: boolean` on the `Notification` interface but the renderer doesn't filter on it. Filtering would require a second state field and defeats AnimatePresence. Remove from render, not from display.
- **Do not introduce a separate `notificationQueue` array in GameState.** The slice(0, 3) approach gives queue behavior for free from the existing array. Adding a second array doubles state management complexity for zero benefit.
- **Do not call `clearTimeout` in the wrong scope.** The `useEffect` cleanup must reference the same timer variable — current code does this correctly, preserve the pattern.
- **Do not trigger quest notifications from QuestBoard.tsx.** `QuestBoard` displays quest state fetched directly from `getDailyQuests()` in its own local state — it does not call the update API. The update API call is in `WorkoutEngine.tsx`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exit animation on dismiss | Custom CSS transition with opacity fade | `AnimatePresence` already wrapping the list | AnimatePresence handles unmount animations automatically; already in place |
| Queue data structure | Separate queue/pending state array | `.slice(0, 3)` on existing notifications array | The array IS the queue; no second data structure needed |
| Timer management | Manual timer registry, cleanup class | React `useEffect` with `clearTimeout` return | Already the correct pattern in NotifItem — extend it, don't replace |

---

## Common Pitfalls

### Pitfall 1: AnimatePresence Key Mismatch
**What goes wrong:** Exit animation doesn't fire even after fix.
**Why it happens:** `AnimatePresence` requires that direct children each have a stable, unique `key`. If the key changes (e.g., index-based keys) between renders, AnimatePresence loses track of which item exited.
**How to avoid:** Keep `key={n.id}` on `NotifItem`. The `id` is generated as `notif-${Date.now()}` in the reducer — guaranteed unique.
**Warning signs:** Items disappear instantly without animation; check that no wrapping element was introduced between `AnimatePresence` and `NotifItem`.

### Pitfall 2: Progress Bar Duration Mismatch
**What goes wrong:** Bar depletes in 6 seconds but notification dismisses in 4 seconds (or vice versa), causing visual desync.
**Why it happens:** `transition={{ duration: 6 }}` on the `motion.div` progress bar is independent of the `setTimeout` in the useEffect. They must use the same numeric value.
**How to avoid:** Compute duration once at the top of `NotifItem`, use `duration / 1000` for the motion transition and `duration` (ms) for setTimeout.
**Warning signs:** Progress bar still animating when notification has already disappeared, or bar still at 50% when notification dismisses.

### Pitfall 3: Double Rank-Up Notification
**What goes wrong:** Player ranks up and sees two notifications — one from reducer, one from Dashboard useEffect.
**Why it happens:** Both code paths independently detect the rank transition and dispatch `ADD_NOTIFICATION`. See Pattern 5 above.
**How to avoid:** Remove the `dispatch({ type: "ADD_NOTIFICATION", ... })` call from the Dashboard `arenaJustUnlocked` useEffect. Keep the flash banner state (`setArenaJustUnlocked`) but do not dispatch a second notification.
**Warning signs:** On first rank change (E→D), two notifications appear in rapid succession.

### Pitfall 4: Quest Notification Fires Multiple Times
**What goes wrong:** A single workout that updates multiple quest types dispatches duplicate notifications.
**Why it happens:** The WorkoutEngine quest-update loop iterates over all matching quests and calls the API once per quest. If all-complete triggers on iteration N of M, the all-complete notification will fire, but if earlier iterations already fired per-quest notifications, ordering can be confusing.
**How to avoid:** Fire per-quest notifications in the loop; fire all-complete notification after the loop completes (check a flag set inside the loop).
**Warning signs:** Multiple "DAILY QUESTS COMPLETE" toasts appearing.

### Pitfall 5: URGENT Notifications Getting Auto-Dismissed
**What goes wrong:** URGENT notification disappears after a few seconds despite being meant to persist.
**Why it happens:** `isUrgent` classification in `NotifItem` currently checks `n.type === "QUEST"` — meaning all QUEST-type notifications are treated as urgent (red border, AlertTriangle icon). This conflicts with the new per-type timeout where QUEST type should auto-dismiss in 4s.
**Root cause:** The existing `isUrgent` logic does not match the intended behavior:
```typescript
// Current code (line 22):
const isUrgent = n.type === "QUEST" || n.title.includes("URGENT") || n.title.includes("PENALTY");
```
QUEST type should NOT be urgent (should auto-dismiss). Only notifications with type `"SYSTEM"` + title containing `"URGENT"` or type `"PENALTY"` should be urgent.
**How to fix:** Update `isUrgent` to a dedicated `"URGENT"` type or title-based check that excludes `QUEST`. Recommend adding `"URGENT"` as a recognized type value or keying urgency on title/body pattern only.
**Warning signs:** Quest completion notifications show red border and ACCEPT_ENTRY button; they never auto-dismiss.

---

## Code Examples

### Reducer Fix
```typescript
// Source: src/lib/gameReducer.ts line 313-314
// BEFORE (broken):
case "DISMISS_NOTIFICATION":
  return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };

// AFTER (fixed):
case "DISMISS_NOTIFICATION":
  return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
```

### Per-Type Duration Lookup
```typescript
// Source: SystemNotification.tsx — NotifItem function
const DISMISS_DURATIONS: Record<string, number> = {
  QUEST: 4000,
  WORKOUT: 4500,
  REWARD: 5000,
  SHADOW: 5000,
  CHAPTER: 5000,
  INFO: 5000,
  PVP: 5000,
  SYSTEM: 5000,
  LEVELUP: 7000,
};

function NotifItem({ n, onDismiss }: { n: Notification; onDismiss: (id: string) => void }) {
  const isUrgent = n.title.includes("URGENT") || n.title.includes("PENALTY");
  const duration = isUrgent ? null : (DISMISS_DURATIONS[n.type] ?? 5000);

  useEffect(() => {
    if (!duration) return; // URGENT: no auto-dismiss
    const t = setTimeout(() => onDismiss(n.id), duration);
    return () => clearTimeout(t);
  }, [n.id, duration, onDismiss]);

  // ... progress bar:
  {!isUrgent && (
    <motion.div
      initial={{ scaleX: 1 }}
      animate={{ scaleX: 0 }}
      transition={{ duration: (duration ?? 5000) / 1000, ease: "linear" }}
      ...
    />
  )}
}
```

### Render Cap
```tsx
// Source: SystemNotification.tsx — SystemNotification default export
{notifications.slice(0, 3).map((n) => (
  <NotifItem key={n.id} n={n} onDismiss={onDismiss} />
))}
```

### WorkoutEngine Quest Notification Dispatch
```typescript
// Source: src/components/arise/WorkoutEngine.tsx — after fetch('/api/quests/update')
const res = await fetch("/api/quests/update", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token ?? ""}` },
  body: JSON.stringify({ questId: q.id, newCurrent: newVal }),
});
const result = await res.json().catch(() => null);
if (result?.success) {
  const updatedQuest = (result.quests as any[]).find((rq: any) => rq.id === q.id);
  // Per-quest: was incomplete before, now complete
  if (!q.completed && updatedQuest?.completed) {
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "QUEST",
        title: `${q.name} COMPLETE`,
        body: `+${q.xp_reward ?? q.xp ?? 0} XP Earned`,
        icon: "✅",
      },
    });
  }
  // All-complete (fire once, after loop)
  // Handled outside the loop — set a flag
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Mark-read flag to "dismiss" | Filter from array | Exit animation fires, notification disappears visually |
| Fixed 6s timeout | Per-type timeout map | Notifications feel contextually appropriate |
| Unbounded render | .slice(0, 3) cap | Screen never floods; queue drains naturally |

---

## Open Questions

1. **Exact `isUrgent` classification**
   - What we know: Current code marks `QUEST` type as urgent (red, no auto-dismiss intent). New behavior requires QUEST to auto-dismiss. URGENT behavior should be reserved for `SYSTEM` alerts with specific title patterns.
   - What's unclear: Is there an `"URGENT"` type we should add to the `Notification` type union, or key urgency entirely on title inspection?
   - Recommendation: Key urgency on title inspection (`n.title.includes("URGENT") || n.title.includes("PENALTY")`) rather than adding a new type. This requires no interface change and matches existing PenaltyZone pattern. Claude's discretion.

2. **WorkoutEngine quest completion: pre-loop vs post-loop all-complete dispatch**
   - What we know: Multiple quests may be updated in a single workout (one type per exercise, but the loop covers all matching quests). The all-complete check must fire at most once.
   - What's unclear: The loop currently has no mechanism to detect "was all-complete before this batch started" vs. "became all-complete during this batch."
   - Recommendation: Before the quest loop, snapshot `const wasAllComplete = questsData.quests.every(q => q.completed)`. After the loop, re-fetch or use the last API response's `allCompleted` flag. Dispatch all-complete notification once outside the loop if `!wasAllComplete && lastResult?.allCompleted`.

3. **Rank-up notification copy update in gameReducer**
   - What we know: `gameReducer.ts` line 265 generates `title: rankChanged ? RANK UP! ${state.user.rank} -> ${rank} : LEVEL UP! -> ${level}`. This copy doesn't match CONTEXT spec.
   - What's unclear: Level-up (no rank change) notification should still fire — what copy does it use? The CONTEXT doesn't address pure level-up (no rank change) copy.
   - Recommendation: Keep level-up notification for pure level advances. Update rank-change notification to `RANK ADVANCEMENT` / `Hunter rank advanced to Rank [RANK]` per CONTEXT spec.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from config.json — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected in project |
| Config file | None — Wave 0 gap |
| Quick run command | N/A — no test runner installed |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated? | Notes |
|----------|-----------|-----------|-------|
| DISMISS_NOTIFICATION removes item from array | unit | manual-only | No test runner; verify via browser: dismiss notification, confirm it disappears |
| Auto-dismiss fires at correct duration per type | manual smoke | manual-only | Trigger QUEST notification, verify 4s dismissal; trigger LEVELUP, verify 7s dismissal |
| Max 3 visible, 4th queues | manual smoke | manual-only | Rapidly trigger 5 notifications, verify only 3 visible, 4th appears when one dismisses |
| URGENT notifications do not auto-dismiss | manual smoke | manual-only | Trigger URGENT (PenaltyZone), verify it persists until X or body click |
| Quest complete notification fires with correct name/XP | manual smoke | manual-only | Complete a workout that satisfies a quest, verify toast shows correct quest name |
| All-daily-complete notification fires once | manual smoke | manual-only | Complete last quest, verify single "DAILY QUESTS COMPLETE" toast |
| Rank-up notification fires on rank change | manual smoke | manual-only | Level to 10, verify "RANK ADVANCEMENT" toast with correct rank value |
| Progress bar duration matches auto-dismiss timeout | visual check | manual-only | Watch bar deplete; should empty exactly when notification disappears |

### Wave 0 Gaps

- No test infrastructure exists in this project. All validation is manual browser smoke testing.
- Framework install not recommended for this phase — phase is 2 files, 3 targeted edits, and manual validation is sufficient.

---

## Sources

### Primary (HIGH confidence)
- Direct source code read: `src/components/system/SystemNotification.tsx` — full component analysis
- Direct source code read: `src/lib/gameReducer.ts` — full reducer analysis, Notification interface, DISMISS case
- Direct source code read: `src/app/api/quests/update/route.ts` — API response shape verified
- Direct source code read: `src/components/arise/WorkoutEngine.tsx` — confirmed quest update call location
- Direct source code read: `src/components/arise/Dashboard.tsx` — confirmed prevRankRef useEffect pattern
- Framer Motion docs (from training, HIGH confidence for AnimatePresence key-based unmount behavior — stable API)

### Secondary (MEDIUM confidence)
- CONTEXT.md locked decisions — authoritative for this project
- UI-SPEC.md — visual contract confirmed against SystemNotification.tsx source

---

## Metadata

**Confidence breakdown:**
- Bug root cause (reducer): HIGH — confirmed by reading exact line 314 of gameReducer.ts
- Fix approach (filter vs map): HIGH — standard React immutable state pattern, confirmed against AnimatePresence behavior
- Quest completion trigger location: HIGH — grep confirmed only WorkoutEngine.tsx calls /api/quests/update
- API response shape: HIGH — read from route.ts source directly
- Rank-up duplication issue: HIGH — both code paths visible in Dashboard.tsx and gameReducer.ts
- Animation behavior: HIGH — AnimatePresence key-based mount/unmount is core framer-motion API, stable

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable codebase, no fast-moving dependencies)
