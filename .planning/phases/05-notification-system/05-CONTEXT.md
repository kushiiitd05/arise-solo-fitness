# Phase 5: Notification System - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken auto-dismiss notification layer (notifications currently stick on screen forever). Implement a queue-aware system capped at 3 visible notifications. Wire all unwired game events (quest completion, rank-up) through the unified notification system.

No new notification types beyond what's already in the codebase. No persistent notification history UI. No per-platform push notifications.

</domain>

<decisions>
## Implementation Decisions

### Dismiss fix
- `DISMISS_NOTIFICATION` reducer must **remove from array** by id (filter out) — NOT mark `read: true`
- Current broken behavior: `.map(n => n.id === id ? { ...n, read: true } : n)` — must become `.filter(n => n.id !== action.payload)`
- `SystemNotification` already uses `AnimatePresence` — exit animation works automatically once item is removed from array

### Auto-dismiss timeouts (per notification type)
- **QUEST / WORKOUT notifications:** 4–5 seconds
- **REWARD notifications (items, gold):** 5 seconds
- **LEVEL UP / ARENA UNLOCK:** 7–8 seconds
- **URGENT system alerts:** persist until manually dismissed (no auto-dismiss timer)
- `NotifItem` useEffect timeout must use type-based duration, not a fixed 6000ms

### Queue behavior
- **Maximum 3 visible notifications at once**
- Additional notifications queue in state; each time a visible notification dismisses, the next queued one slides in (FIFO)
- Queue implementation: `SystemNotification` renders only the first 3 from the array; the rest are "pending" and surface as slots open
- URGENT notifications occupy a normal slot (no special out-of-queue treatment)

### Unwired event triggers to add

| Event | Trigger location | Notification |
|-------|-----------------|-------------|
| Individual quest complete | Quest update client-side (after API response confirms completion) | Type: QUEST, Title: `[QUEST NAME] COMPLETE`, Body: `+[XP] XP Earned`, 4s |
| All daily quests complete | Same location, after last quest completes | Type: QUEST, Title: `DAILY QUESTS COMPLETE`, Body: `All missions accomplished. Full XP awarded.`, 5s |
| Rank advancement | gameReducer GAIN_XP case or level-up handler, when rank changes | Type: LEVELUP, Title: `RANK ADVANCEMENT`, Body: `Hunter rank advanced to Rank [RANK]`, 7s, cyan border |

- **Stat allocation:** NO notification — too noisy for interactive stat spend
- Quest name in per-quest notification should use the quest's actual name/label from the quest object

### Manual dismiss UX
- **X button** on URGENT notifications: dispatches `DISMISS_NOTIFICATION` immediately — same as clicking the notification body
- **Click-to-dismiss** (already implemented): keep as-is
- **No "clear all" button** — max 3 visible makes individual dismiss sufficient

### Claude's Discretion
- Exact queue data structure (whether to use a separate `notificationQueue` array in state, or slice the existing `notifications` array in the renderer)
- Progress bar animation duration must match per-type timeout (currently hardcoded to 6s in `motion.div`)
- Whether rank detection for rank-up notification lives in reducer or a useEffect in Dashboard/page.tsx

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Notification system
- `src/components/system/SystemNotification.tsx` — Full notification UI component, NotifItem with auto-dismiss timer, AnimatePresence, type-based styling
- `src/lib/gameReducer.ts` — `Notification` interface (line 48), `ADD_NOTIFICATION` / `DISMISS_NOTIFICATION` reducer cases (lines 310–314), `notifications: Notification[]` in state (line 80)
- `src/app/page.tsx` — Where `SystemNotification` is rendered and `onDismiss` is wired (lines 185–188)

### Event sources (where to add new dispatch calls)
- `src/components/arise/Dashboard.tsx` — Quest update calls + rank detection logic
- `src/components/arise/Arena.tsx` — Existing ADD_NOTIFICATION example (line 82)
- `src/components/arise/BossEvent.tsx` — Existing ADD_NOTIFICATION examples (lines 223, 233)
- `src/components/arise/WorkoutEngine.tsx` — Existing ADD_NOTIFICATION example (line 194)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SystemNotification.tsx` — Already styled, already uses AnimatePresence for enter/exit. Only needs: (1) reducer fix, (2) per-type timeout in NotifItem, (3) render-cap of 3
- `Notification` type in gameReducer: `{ id, type, title, body, icon, createdAt, read }` — `type` field drives icon/color in NotifItem
- Existing notification types in use: `LEVELUP`, `SHADOW`, `CHAPTER`, `QUEST`, `SYSTEM`, `PVP`, `INFO`

### Established Patterns
- All hex colors: `#7C3AED` (purple/shadow), `#06B6D4` (cyan/levelup), `#EF4444` (red/urgent), `#E2E8F0` (default)
- `dispatch({ type: "ADD_NOTIFICATION", payload: { type, title, body, icon } })` — standard call pattern
- Framer Motion AnimatePresence already wraps notification list — exit animation just works when item removed from array

### Integration Points
- `gameReducer.ts:314` — `DISMISS_NOTIFICATION` case: change `.map(read: true)` to `.filter(id !== payload)`
- `SystemNotification.tsx:NotifItem useEffect` — change `setTimeout(..., 6000)` to type-based duration
- `SystemNotification.tsx` render — add `.slice(0, 3)` to cap visible notifications
- Quest completion path in Dashboard — after `fetch('/api/quests/update')` confirms completion, dispatch per-quest and (if all done) all-complete notification

</code_context>

<specifics>
## Specific Ideas

- Progress bar at bottom of each notification (`motion.div scaleX: 1→0`) must sync its duration with the per-type timeout or it'll look wrong
- URGENT type: remove the auto-dismiss timer entirely in NotifItem (don't set timeout), only dismiss via X or body click
- Queue: `notifications.slice(0, 3)` in render is the simplest implementation — no separate queue array needed in state

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-notification-system*
*Context gathered: 2026-03-16*
