# Phase 4: Feature Completion - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire 4 remaining UI surfaces into the Dashboard: Arena unlock gate (conditional render based on rank), mobile bottom navigation bar, Achievement Hall (accessible from STATUS panel), and Guild Hall (new sidebar tab). No new backend systems — scope is rendering existing components and connecting them to existing state/data.

</domain>

<decisions>
## Implementation Decisions

### Arena unlock gate
- Unlock rank: **Rank D** (not C — the hardcoded copy in Dashboard.tsx is wrong and must be updated)
- Lock screen must show a **dynamic XP progress bar** toward Rank D — derived from `rankAtLevel()` and `xpForLevel()` (both already imported in Dashboard)
- When Rank D is reached: render **"COMBAT AUTHORIZATION GRANTED" flash animation** + reward notification ("+500 XP / +200 Gold / Arena Unlocked") that fades after 3–5 seconds, then Arena.tsx renders
- After unlocking, ARENA tab renders `<Arena state={state} dispatch={dispatch} onClose={...} />` instead of the lock screen

### Nav expansion — desktop
- Achievement Hall: **NOT a nav tab**. Stays lean. Accessed from STATUS panel card.
- Guild Hall: **New GUILD sidebar tab** (tab 6) with Users icon — `GuildHallProps` accepts `{ state: GameState }`
- Desktop nav remains: STATUS, SHADOWS, STORAGE, GATES, ARENA, GUILD (6 tabs)

### Achievement Hall — STATUS panel integration
- STATUS panel gets an **"ACHIEVEMENTS" card** showing the last 3 unlocked achievements as a preview
  - Example: "First Workout", "3 Day Streak", "Rank Trial Initiated"
- Clicking the card opens AchievementHall.tsx as a **full-screen overlay** (slides over current view)
- Overlay has a close button to return to STATUS

### Achievement Hall — data wiring (hybrid)
- **Wire from real data:**
  - "First Workout" — quest_completions > 0 (from shadow/quest state)
  - "Iron Will" — 7-day streak (from DB streak field if available, else mock)
  - "First Shadow" — shadow count > 0 (from state.shadows or API)
  - "Shadow Monarch" — shadow count >= 10
- **All other achievements:** keep existing mock data with hardcoded progress
- **Categories:** Simplify to FITNESS, SOCIAL, COLLECTION — remove PVP and DUNGEON tabs (those systems are not built yet)

### Mobile bottom navigation
- **4 tabs:** STATUS, GATES, STORAGE, ARENA
- Rationale: Fitness loop priority (GATES = daily quests), inventory for rewards (STORAGE), progression motivation (ARENA)
- GUILD and SHADOWS are secondary on mobile — accessible from STATUS panel
- **Style:** Icon + label + purple glow on active tab (matches ARISE aesthetic)
- Nav is `fixed bottom-0` — full width, above safe area inset on iOS

### Claude's Discretion
- Exact XP progress bar animation style for Arena lock screen
- Overlay open/close animation for Achievement Hall (slide, fade, or scale)
- How to detect "just reached Rank D" — edge detection in useEffect or after quest completion
- Exact reward notification component shape (can reuse existing notification patterns if they exist)
- GuildHall's `supabase.removeChannel()` should be fixed to `sub.unsubscribe()` per Phase 1 established pattern

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `rankAtLevel(user.level)` — already imported and computed in Dashboard.tsx:43. Returns E/D/C/B/A/S string.
- `xpForLevel()` — available from gameReducer, use to compute % progress toward next rank boundary
- `Arena.tsx` — props: `{ state: GameState, dispatch, onClose: () => void }`. Full mock PvP simulation.
- `AchievementHall.tsx` — props: `{ onClose?: () => void }`. Self-contained with internal state.
- `GuildHall.tsx` — props: `{ state: GameState }`. Has real Supabase chat integration.
- `systemAudio?.playClick()` — available via `@/lib/audio`, use for tab transitions
- Framer Motion `AnimatePresence` — already imported in Dashboard, use for overlay animation

### Established Patterns
- Dashboard tab switching: `setActiveTab("ARENA")` pattern — extend for GUILD tab
- Desktop nav: `hidden lg:flex` (left sidebar) — mobile nav is `flex lg:hidden fixed bottom-0`
- All hex colors, no CSS variables: purple `#7C3AED`, cyan `#06B6D4`, amber `#D97706`, red `#EF4444`
- `sub.unsubscribe()` not `supabase.removeChannel()` — GuildHall has this bug, fix it
- Auth: Bearer header only in any new API calls

### Integration Points
- `Dashboard.tsx:35` — extend `activeTab` union type to include `"GUILD"`
- `Dashboard.tsx:47-51` — navItems array, add GUILD entry
- `Dashboard.tsx:288-297` — ARENA conditional block, replace hardcoded lock with rank gate logic
- STATUS panel render block — add Achievements card with last-3 preview + overlay trigger
- New `useState<boolean>` for Achievement overlay open/closed state

</code_context>

<specifics>
## Specific Ideas

- Arena lock screen copy: "Combat authorization denied. PvP access restricted to Rank D hunters. Current Rank: {rank}. Progress to Rank D: {xp}/{xpNeeded}"
- Achievement card in STATUS: show "RECENT ACHIEVEMENTS" header + 3 latest completed achievement names + trophy icon + "View All →" link
- "COMBAT AUTHORIZATION GRANTED" flash: green border pulse, text flash, then cross-fade into Arena panel
- Reward notification on Arena unlock: same notification style as other system alerts — "+500 XP / +200 Gold / Arena Unlocked" — auto-dismiss in 3–5 seconds
- Mobile nav active tab glow: `drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]` on active icon (same as desktop nav line indicator)
- Fitness-first principle: Arena access should feel earned through real workout progression, not arbitrary clicks

</specifics>

<starred>
## ⭐ Starred — MUST BUILD (Planned Future Phases)

These are confirmed in-scope systems. They are deferred from Phase 4 only because they are larger than Phase 4's scope. Each MUST be researched and planned — do NOT exclude from roadmap.

- **Full Rank Trial system** — formal workout challenge to advance rank (workout → trial → pass → rank D). Must research progression gating, trial flow, rank XP rules.
- **Notification system** — auto-dismiss notifications across all events (quest completion, stat allocation, reward unlock, system alerts). Flagged as broken (stuck on screen). Must fix and unify.
- **Ollama AI integration** — dynamic monster names, boss personalities, quest descriptions, workout challenge variations. Must research Ollama API, streaming, prompt templates.
- **Manhwa chapter reward system** — chapter unlock UI on quest/boss completion. Must research unlock gating, reader integration, reward trigger events.
- **Battle system backend** — Arena battles via backend API using real player stats. Must replace client-side simulation with real matchmaking + stats.
- **Rank XP calculation system** — formal rules for which events grant rank XP. Must design multi-event model (workouts, quests, boss kills all contribute).
- **Dynamic daily quest generation** — level-adaptive quest generation vs. fixed templates. Must research generation algorithm, difficulty scaling.
- **Inventory item effects** — permanent vs. temporary stat bonuses from equipped items. Must design effect engine, persistence.
- **Shadow army mechanics** — formalized extraction/reward flow for shadows. Must design extraction trigger, shadow stats, army composition rules.

</starred>

---

*Phase: 04-feature-completion*
*Context gathered: 2026-03-15*
