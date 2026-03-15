# Phase 4: Feature Completion - Research

**Researched:** 2026-03-15
**Domain:** React/Next.js UI wiring — Dashboard tab expansion, conditional rendering, overlay patterns, Framer Motion animation, Supabase realtime subscription cleanup
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Arena unlock gate**
- Unlock rank: Rank D (not C — the hardcoded copy in Dashboard.tsx is wrong and must be updated)
- Lock screen must show a dynamic XP progress bar toward Rank D — derived from `rankAtLevel()` and `xpForLevel()` (both already imported in Dashboard)
- When Rank D is reached: render "COMBAT AUTHORIZATION GRANTED" flash animation + reward notification ("+500 XP / +200 Gold / Arena Unlocked") that fades after 3–5 seconds, then Arena.tsx renders
- After unlocking, ARENA tab renders `<Arena state={state} dispatch={dispatch} onClose={...} />` instead of the lock screen

**Nav expansion — desktop**
- Achievement Hall: NOT a nav tab. Stays lean. Accessed from STATUS panel card.
- Guild Hall: New GUILD sidebar tab (tab 6) with Users icon — `GuildHallProps` accepts `{ state: GameState }`
- Desktop nav remains: STATUS, SHADOWS, STORAGE, GATES, ARENA, GUILD (6 tabs)

**Achievement Hall — STATUS panel integration**
- STATUS panel gets an "ACHIEVEMENTS" card showing the last 3 unlocked achievements as a preview
- Clicking the card opens AchievementHall.tsx as a full-screen overlay (slides over current view)
- Overlay has a close button to return to STATUS

**Achievement Hall — data wiring (hybrid)**
- Wire from real data: "First Workout" (quest_completions > 0), "Iron Will" (7-day streak from DB streak field if available, else mock), "First Shadow" (shadow count > 0), "Shadow Monarch" (shadow count >= 10)
- All other achievements: keep existing mock data with hardcoded progress
- Categories: Simplify to FITNESS, SOCIAL, COLLECTION — remove PVP and DUNGEON tabs

**Mobile bottom navigation**
- 4 tabs: STATUS, GATES, STORAGE, ARENA
- Style: Icon + label + purple glow on active tab (matches ARISE aesthetic)
- Nav is `fixed bottom-0` — full width, above safe area inset on iOS

### Claude's Discretion
- Exact XP progress bar animation style for Arena lock screen
- Overlay open/close animation for Achievement Hall (slide, fade, or scale)
- How to detect "just reached Rank D" — edge detection in useEffect or after quest completion
- Exact reward notification component shape (can reuse existing notification patterns if they exist)
- GuildHall's `supabase.removeChannel()` should be fixed to `sub.unsubscribe()` per Phase 1 established pattern

### Deferred Ideas (OUT OF SCOPE)
- Full Rank Trial system (formal workout challenge to advance rank)
- Notification system (auto-dismiss notifications across all events)
- Ollama AI integration
- Manhwa chapter reward system
- Battle system backend
- Rank XP calculation system
- Dynamic daily quest generation
- Inventory item effects
- Shadow army mechanics
</user_constraints>

---

## Summary

Phase 4 is a pure UI wiring phase. All four target surfaces (Arena unlock gate, mobile bottom nav, Achievement Hall, Guild Hall) have their component implementations already written. The work is entirely about integrating them into Dashboard.tsx through conditional rendering, state hooks, and layout additions — plus a single bug fix in GuildHall.tsx's subscription cleanup.

The codebase uses Framer Motion (already imported in Dashboard) for all animation, Tailwind with explicit hex values (no CSS variables), and the `gameReducer` pattern for all game state. No new backend calls are needed for this phase — all required data exists in `state` already.

**Primary recommendation:** Each of the two plans in this phase (04-01, 04-02) maps cleanly to a single file — Dashboard.tsx. Both plans modify the same file, so plan ordering matters: 04-01 should complete the `activeTab` type extension and nav arrays before 04-02 adds the Achievement overlay state.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | Component model, hooks | Project foundation |
| Framer Motion | 11.x | AnimatePresence, motion.div for overlays and tab transitions | Already in Dashboard.tsx, all animations use it |
| Tailwind CSS | 3.x | Utility classes for layout and responsive breakpoints | Project-wide styling system |
| lucide-react | latest | Icons for nav tabs (Users icon for GUILD) | Already used in all components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | - | `cn()` helper for conditional classNames | Used in all arise components — copy pattern |
| Supabase JS v2 | 2.x | Realtime subscription cleanup via `sub.unsubscribe()` | GuildHall cleanup bug fix |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Framer Motion overlay | CSS transition | Framer Motion is already imported and used; consistency wins |
| New notification component | Reuse `dispatch("ADD_NOTIFICATION")` | Reusing existing system is simpler, avoids duplication |

**Installation:**
No new packages needed. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
No new files required for this phase. All changes are in:
```
src/components/arise/
├── Dashboard.tsx        # Primary target: nav, tabs, Arena gate, Achievement overlay
├── GuildHall.tsx        # Bug fix: supabase.removeChannel() → sub.unsubscribe()
├── AchievementHall.tsx  # Data wiring: real achievement flags, remove PVP/DUNGEON tabs
```

### Pattern 1: Dashboard Tab Extension
**What:** Extend the `activeTab` union type and `TABS` array to include `"GUILD"`.
**When to use:** Adding a new primary navigation destination to the desktop sidebar.

Current state (Dashboard.tsx:35):
```typescript
// CURRENT — must change
const [activeTab, setActiveTab] = useState<"STATUS" | "SHADOWS" | "STORAGE" | "GATES" | "ARENA">("STATUS");

const TABS = [
  { id: "STATUS",  label: "STATUS",  icon: <LayoutDashboard size={20} /> },
  { id: "SHADOWS", label: "SHADOWS", icon: <Ghost size={20} /> },
  { id: "STORAGE", label: "STORAGE", icon: <Package size={20} /> },
  { id: "GATES",   label: "GATES",   icon: <DoorOpen size={20} /> },
  { id: "ARENA",   label: "ARENA",   icon: <Swords size={20} /> },
];
```

Target state:
```typescript
// ADD "GUILD" to union
const [activeTab, setActiveTab] = useState<
  "STATUS" | "SHADOWS" | "STORAGE" | "GATES" | "ARENA" | "GUILD"
>("STATUS");

// ADD Users import from lucide-react (already imported in GuildHall — must add to Dashboard)
{ id: "GUILD", label: "GUILD", icon: <Users size={20} /> },
```

### Pattern 2: Arena Rank Gate Conditional Render
**What:** Replace the always-showing lock screen with a conditional based on `rank >= "D"`.
**When to use:** Feature unlock gates tied to player progression.

The existing Arena block (Dashboard.tsx:288-301) always shows the lock screen. Replace with:

```typescript
{activeTab === "ARENA" && (
  <motion.div key="arena" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto">
    {rank === "E" ? (
      // Lock screen with XP progress bar toward Rank D
      // rank = rankAtLevel(user.level) — already computed at line 43
      // Rank D threshold: level >= 10 (from rankAtLevel in gameReducer.ts:92-98)
      <ArenaLockScreen rank={rank} level={user.level} currentXp={user.currentXp} xpMax={xpMax} />
    ) : (
      <Arena state={state} dispatch={dispatch} onClose={() => setActiveTab("STATUS")} />
    )}
  </motion.div>
)}
```

**Key data for the progress bar:**
- `rankAtLevel(level)` returns "D" when `level >= 10`
- XP needed for level 10: `xpForLevel(10) = Math.floor(1000 * Math.pow(10, 1.35)) = 22,387 XP`
- Current progress to Rank D = how close `user.level` is to 10, plus `user.currentXp / xpForLevel(user.level)` within the current level
- Simplest approach: `levelsRemaining = Math.max(0, 10 - user.level)`, display "X levels to Rank D"
- For a smooth bar: total XP accumulated = `totalXpForLevel(user.level) + user.currentXp`; target = `totalXpForLevel(10)`

**CRITICAL INSIGHT:** `rankAtLevel` in `gameReducer.ts` uses level thresholds, NOT the `RANK_THRESHOLDS` from `xpEngine.ts`. They differ:
- `gameReducer.rankAtLevel`: D = level >= 10
- `xpEngine.RANK_THRESHOLDS`: D = minLevel 10 AND minXp 5,000

Dashboard already imports `rankAtLevel` from gameReducer (line 5). Use this consistently. Do NOT mix with xpEngine's `rankFromLevelAndXp`. The current rank variable at line 43 (`const rank = rankAtLevel(user.level)`) is correct — the gate check is simply `rank !== "E"`.

### Pattern 3: Achievement Hall Full-Screen Overlay
**What:** useState boolean to mount AchievementHall.tsx as a fixed full-screen overlay inside AnimatePresence.
**When to use:** Secondary views that slide over the current panel without changing the nav tab.

```typescript
// New state hook in Dashboard
const [showAchievements, setShowAchievements] = useState(false);

// In AnimatePresence block at bottom of Dashboard (where Profile, QuestBoard etc. live):
{showAchievements && (
  <AchievementHall onClose={() => setShowAchievements(false)} />
)}
```

AchievementHall.tsx already accepts `onClose?: () => void` and renders `min-h-full`. It needs to be wrapped in a fixed-position container to overlay:
```typescript
<motion.div
  key="achievements"
  initial={{ opacity: 0, x: "100%" }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: "100%" }}
  transition={{ type: "tween", duration: 0.25 }}
  className="fixed inset-0 z-[200] bg-[#030308] overflow-y-auto"
>
  <AchievementHall onClose={() => setShowAchievements(false)} />
</motion.div>
```

### Pattern 4: STATUS Panel Achievements Card
**What:** Add an ACHIEVEMENTS preview card to the STATUS panel, alongside the existing SHADOW_ARMY_COMMAND and WORLD_RANKINGS cards.
**Location:** Dashboard.tsx STATUS panel, in the right-column `space-y-12` div (lines 230-265).

Compute last-3 completed achievements from real data in component:
```typescript
// Derive achievement completion flags from state
const completedAchievements = [
  { id: "first-workout",   name: "FIRST WORKOUT",   completed: (stats?.totalWorkouts ?? 0) > 0 },
  { id: "iron-will",       name: "IRON WILL",        completed: (stats?.currentStreak ?? 0) >= 7 },
  { id: "first-shadow",    name: "FIRST SHADOW",     completed: (shadows?.length ?? 0) > 0 },
  { id: "shadow-monarch",  name: "SHADOW MONARCH",   completed: (shadows?.length ?? 0) >= 10 },
].filter(a => a.completed).slice(0, 3);
```

### Pattern 5: Mobile Bottom Navigation
**What:** New nav bar using `flex lg:hidden fixed bottom-0` classes, full width, 4 tabs.
**When to use:** Primary navigation on small screens where the desktop sidebar is hidden.

```typescript
{/* MOBILE BOTTOM NAV — place just before closing </div> of the outer wrapper */}
<nav className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080514]/95 backdrop-blur-3xl border-t border-[#7C3AED]/20 safe-area-padding-bottom">
  {MOBILE_TABS.map(tab => (
    <button
      key={tab.id}
      onClick={() => { setActiveTab(tab.id as any); systemAudio?.playClick(); }}
      className={cn(
        "flex-1 flex flex-col items-center py-3 gap-1 transition-all",
        activeTab === tab.id
          ? "text-[#7C3AED] drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]"
          : "text-[#94A3B8] hover:text-[#E2E8F0]"
      )}
    >
      {tab.icon}
      <span className="text-[8px] font-orbitron font-black tracking-widest uppercase">{tab.label}</span>
    </button>
  ))}
</nav>
```

Mobile tab set (4 tabs, separate from desktop TABS array):
```typescript
const MOBILE_TABS = [
  { id: "STATUS",  label: "STATUS",  icon: <LayoutDashboard size={20} /> },
  { id: "GATES",   label: "GATES",   icon: <DoorOpen size={20} /> },
  { id: "STORAGE", label: "STORAGE", icon: <Package size={20} /> },
  { id: "ARENA",   label: "ARENA",   icon: <Swords size={20} /> },
];
```

**iOS safe area:** Add `pb-safe` or `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` on the nav container. Tailwind alone does not handle `safe-area-inset-bottom` — use inline style or a Tailwind plugin.

The `pb-40` on `<main>` (Dashboard.tsx:175) already adds bottom clearance — this keeps mobile content above the nav bar. Verify the value is sufficient for both the nav height + safe area.

### Anti-Patterns to Avoid
- **Mixing rankAtLevel sources:** Dashboard uses `rankAtLevel` from `gameReducer`, NOT `rankFromLevelAndXp` from `xpEngine`. Do not import from xpEngine in Dashboard — different formulas, different results.
- **Direct supabase.removeChannel():** GuildHall.tsx:80 calls `supabase.removeChannel(sub)`. This is the documented bug from State.md. Fix to `sub.unsubscribe()`.
- **PVP/DUNGEON categories in AchievementHall:** CONTEXT.md locks removal of these tabs. Do not leave them. Remove from the `TABS` array and the `Category` type.
- **Using CSS variables for colors:** Project uses explicit hex values everywhere. Any new classes must use hex, not Tailwind color names that map to variables.
- **Adding Guild as overlay:** Guild Hall is a sidebar TAB (tab 6), not an overlay like Achievement Hall. They are different patterns.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab transition animation | Custom CSS keyframes | `AnimatePresence` + `motion.div` | Already used for all other tabs in Dashboard.tsx |
| Arena unlock notification | Custom dismissible alert | `dispatch({ type: "ADD_NOTIFICATION", payload: {...} })` | SystemNotification in page.tsx handles display + 6s auto-dismiss |
| Overlay slide animation | CSS transitions | Framer Motion `initial/animate/exit` with `x: "100%"` | Consistent with existing overlays (Profile, QuestBoard, etc.) |
| "Just unlocked" edge detection | Complex state machine | `useEffect` comparing prev rank to current rank via `useRef` | Single-effect, simple prev-value pattern |

---

## Common Pitfalls

### Pitfall 1: `rankAtLevel` vs `rankFromLevelAndXp` Mismatch
**What goes wrong:** Using `xpEngine.rankFromLevelAndXp` in Dashboard logic while the displayed rank uses `gameReducer.rankAtLevel` — they produce different results and the Arena gate condition becomes wrong.
**Why it happens:** Two rank calculation functions exist in the codebase with different inputs and thresholds.
**How to avoid:** Dashboard.tsx already computes `const rank = rankAtLevel(user.level)` at line 43. Use this variable for the gate check. Never import from xpEngine inside Dashboard.
**Warning signs:** Arena unlocks at the wrong level, or never unlocks despite correct level.

### Pitfall 2: `activeTab` Type Missing `"GUILD"`
**What goes wrong:** TypeScript error when setting `setActiveTab("GUILD")` if the union type is not extended. The build may fail silently at runtime on strict mode or cause TS compile errors.
**Why it happens:** The union is explicit: `"STATUS" | "SHADOWS" | "STORAGE" | "GATES" | "ARENA"`.
**How to avoid:** Extend the union type at the `useState` declaration AND in any function parameter that accepts `activeTab` values before adding GUILD to TABS array or nav handlers.

### Pitfall 3: Main Content Not Scrolling Above Mobile Nav
**What goes wrong:** Bottom content hidden behind the mobile nav bar.
**Why it happens:** `<main>` has `pb-40` which may not account for the nav height on all devices. The nav is ~64px + iOS safe area.
**How to avoid:** Verify `pb-40` (160px) is adequate. On iPhone with notch, safe area can add 34px, making total ~98px. 160px covers this. If adjusting, use `pb-28` minimum or dynamic padding.

### Pitfall 4: `supabase.removeChannel()` Bug in GuildHall
**What goes wrong:** Supabase realtime channel leaks when GuildHall unmounts (e.g., switching from GUILD tab to another tab).
**Why it happens:** `supabase.removeChannel(sub)` is wrong API for Supabase v2. The channel object returned by `subscribeToGuildChat` (which returns a `RealtimeChannel`) owns its own cleanup via `.unsubscribe()`.
**How to avoid:** GuildHall.tsx:80: change `supabase.removeChannel(sub)` to `sub.unsubscribe()`. This is the established project pattern per STATE.md decisions.

### Pitfall 5: AchievementHall Categories Not Simplified
**What goes wrong:** PVP and DUNGEON tabs remain visible in Achievement Hall, showing content for systems not built yet.
**Why it happens:** AchievementHall.tsx has `TABS: Category[] = ["ALL", "FITNESS", "SOCIAL", "COLLECTION", "PVP", "DUNGEON"]` at line 76. This must be changed.
**How to avoid:** Change to `["ALL", "FITNESS", "SOCIAL", "COLLECTION"]`. Also update the `Category` type to remove "PVP" and "DUNGEON" (or keep them as valid types but not shown in tabs — either approach works).

### Pitfall 6: Achievement Preview Using Stale Mock Data
**What goes wrong:** The STATUS panel shows hardcoded achievement names instead of real state.
**Why it happens:** The current AchievementHall.tsx uses all-static `ACHIEVEMENTS` array with no props from GameState. The STATUS panel preview must derive from real state.
**How to avoid:** The preview card in Dashboard's STATUS panel should compute completed achievements inline from `state.stats` and `state.shadows`. AchievementHall.tsx itself can still use its internal ACHIEVEMENTS array — only the preview card in STATUS needs real data.

---

## Code Examples

### Arena XP Progress Bar Toward Rank D

```typescript
// Source: gameReducer.ts — rankAtLevel thresholds
// Rank D = level >= 10
// Compute progress across levels

const RANK_D_LEVEL = 10;
const levelsToRankD = Math.max(0, RANK_D_LEVEL - user.level);
// For a filled progress bar: treat each level as a segment
// Current: (user.level - 1) / (RANK_D_LEVEL - 1) * 100
const rankDProgress = Math.min(
  100,
  Math.round(((user.level - 1) / (RANK_D_LEVEL - 1)) * 100)
);
```

Lock screen copy (from CONTEXT.md specifics):
```
Combat authorization denied. PvP access restricted to Rank D hunters.
Current Rank: {rank}. Levels to Rank D: {levelsToRankD}.
```

### "Just Reached Rank D" Edge Detection

```typescript
// In Dashboard component — detect rank transition using useRef
const prevRankRef = useRef<string>(rank);
const [arenaJustUnlocked, setArenaJustUnlocked] = useState(false);

useEffect(() => {
  if (prevRankRef.current === "E" && rank !== "E") {
    // Rank D just reached
    setArenaJustUnlocked(true);
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "SYSTEM",
        title: "COMBAT AUTHORIZATION GRANTED",
        body: "+500 XP / +200 Gold / Arena Unlocked",
        icon: "⚔️",
      },
    });
    // Auto-clear flash after 4 seconds
    const t = setTimeout(() => setArenaJustUnlocked(false), 4000);
    return () => clearTimeout(t);
  }
  prevRankRef.current = rank;
}, [rank]);
```

Note: The "+500 XP / +200 Gold" in the notification is display-only. Actual XP grant would require a `dispatch({ type: "ADD_XP", payload: 500 })`. CONTEXT.md leaves the reward notification shape to Claude's discretion — using `ADD_NOTIFICATION` with the reward text is sufficient; granting actual XP is optional for this phase.

### Existing Notification Pattern (from SystemNotification.tsx)

```typescript
// Source: src/components/system/SystemNotification.tsx
// Auto-dismisses in 6 seconds via useEffect timeout
// Receives via: state.notifications + DISMISS_NOTIFICATION dispatch
// Supports types: "SYSTEM" | "QUEST" | "GUILD" | "PVP" | "ACHIEVEMENT" | "CHAPTER" | "LEVELUP" | "SHADOW"
// For Arena unlock: type "SYSTEM" renders with cyan accent (#06B6D4)
dispatch({
  type: "ADD_NOTIFICATION",
  payload: {
    type: "SYSTEM",
    title: "COMBAT AUTHORIZATION GRANTED",
    body: "+500 XP / +200 Gold / Arena Unlocked",
    icon: "⚔️",
  },
});
```

### Mobile Nav Safe Area

```typescript
// iOS safe area inset via inline style — Tailwind does not handle env() by default
<nav
  className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080514]/95 backdrop-blur-3xl border-t border-[#7C3AED]/20"
  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hardcoded "Rank C minimum" copy in Arena lock | Dynamic `rank` variable from `rankAtLevel(user.level)` | Correct unlock condition, no stale copy |
| `supabase.removeChannel(sub)` | `sub.unsubscribe()` | Fixes channel leak in GuildHall |
| Static ACHIEVEMENTS array for preview | Real data from `state.stats` + `state.shadows` | Achievement preview reflects actual player state |

**Deprecated/outdated in this codebase:**
- `supabase.removeChannel()`: Wrong API for Supabase JS v2. Replaced by channel-owned `.unsubscribe()`.
- Rank C Arena gate copy: Wrong threshold (CONTEXT.md locks this to Rank D = level 10).

---

## Open Questions

1. **Arena unlock XP/Gold reward — should it actually be granted?**
   - What we know: CONTEXT.md says "+500 XP / +200 Gold / Arena Unlocked" in the notification. There is no Gold field in `GameState`.
   - What's unclear: Is Gold a display-only concept or a real stat? `GameState` has no `gold` field in `gameReducer.ts`.
   - Recommendation: Show the reward text in the notification only. Do not grant actual Gold (no field exists). Optionally grant +500 XP via `ADD_XP` — planner's call.

2. **AchievementHall.tsx — pass state as prop vs. keep internal mock data?**
   - What we know: The component is self-contained with internal ACHIEVEMENTS array. The CONTEXT.md says 4 achievements wire to real data; all others stay mock.
   - What's unclear: Does AchievementHall receive a `state` prop, or do the real-data flags get pre-computed in Dashboard and passed as a prop?
   - Recommendation: Add a `completedIds?: string[]` prop to AchievementHall that overrides `completed: boolean` for the 4 real achievements. Keeps the component self-contained.

---

## Validation Architecture

`workflow.nyquist_validation` is not present in config.json — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test directories found |
| Config file | None — Wave 0 would need to create it |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

This phase is entirely UI-only with no new API routes or data-layer logic. All behavior is visual rendering and state branching. Automated unit tests for conditional JSX rendering require a test harness not present in this project.

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| 04-ARENA-GATE | Arena shows lock when rank E, Arena.tsx when rank D+ | manual-only | N/A — no test framework | No test framework |
| 04-MOBILE-NAV | 4 mobile tabs visible below lg breakpoint, hidden above | manual-only | N/A | No test framework |
| 04-ACHIEVEMENT-OVERLAY | Achievement Hall opens/closes from STATUS card click | manual-only | N/A | No test framework |
| 04-GUILD-TAB | GUILD tab appears in desktop nav, renders GuildHall | manual-only | N/A | No test framework |
| 04-GUILD-CLEANUP | `sub.unsubscribe()` called on GuildHall unmount | manual-only | N/A | No test framework |

**Manual verification checklist (replaces automated tests):**
- [ ] Navigate to ARENA tab at Rank E — lock screen shows with XP progress bar
- [ ] Level up to level 10 — "COMBAT AUTHORIZATION GRANTED" notification appears, Arena.tsx renders
- [ ] Resize browser below lg breakpoint — mobile bottom nav appears with 4 tabs
- [ ] Resize above lg — mobile nav hidden, desktop sidebar visible
- [ ] Click ACHIEVEMENTS card in STATUS panel — full-screen overlay slides in
- [ ] Click close button — overlay closes, STATUS panel visible
- [ ] Click GUILD tab in desktop nav — GuildHall renders
- [ ] Switch away from GUILD tab — no console errors about channel cleanup

### Wave 0 Gaps
- [ ] No test framework installed — all validation is manual browser testing
- [ ] No Wave 0 setup needed (UI-only phase, no test infrastructure required)

*(Note: If a test framework is desired, `vitest` + `@testing-library/react` is the recommended stack for Next.js 13+ App Router projects. Not blocking for this phase.)*

---

## Sources

### Primary (HIGH confidence)
- Direct source code read: `src/components/arise/Dashboard.tsx` — full component, integration points identified at exact line numbers
- Direct source code read: `src/lib/gameReducer.ts` — `rankAtLevel` formula, `GameState` type, action types
- Direct source code read: `src/components/arise/Arena.tsx` — props interface confirmed
- Direct source code read: `src/components/arise/AchievementHall.tsx` — props interface, category structure, tab array
- Direct source code read: `src/components/arise/GuildHall.tsx` — bug confirmed at line 80
- Direct source code read: `src/lib/game/xpEngine.ts` — RANK_THRESHOLDS confirmed (different from gameReducer.rankAtLevel)
- Direct source code read: `src/components/system/SystemNotification.tsx` — notification pattern, auto-dismiss behavior
- `.planning/phases/04-feature-completion/04-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — established project decisions (sub.unsubscribe, hex palette, Bearer auth)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Integration points: HIGH — all line numbers verified by reading source
- Animation patterns: HIGH — Framer Motion AnimatePresence already in use, patterns replicated from existing code
- Rank gate logic: HIGH — rankAtLevel formula read directly, threshold confirmed (level >= 10 = Rank D)
- GuildHall bug: HIGH — confirmed at line 80 of GuildHall.tsx
- iOS safe area: MEDIUM — standard web platform API, project has no existing mobile nav to compare against

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable codebase, no fast-moving external dependencies)
