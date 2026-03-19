---
phase: 13-ollama-ai-integration
plan: 01
subsystem: ai
tags: [ollama, typescript, react, ai, animation]

# Dependency graph
requires: []
provides:
  - ollamaGenerate shared fetch utility with AbortController timeout and model config
  - aiCache module-level session cache (get/set/has)
  - generateBossBlurb prompt function (bossName, bossRank, playerRank)
  - generateQuestLore prompt function (questName, difficulty, jobClass)
  - generateWorkoutTagline prompt function (jobClass)
  - generateArenaOpponent prompt function (playerRank) returning ArenaOpponent | null
  - TypingText React component with per-character animation and blinking cursor
affects:
  - 13-02 (UI wiring — all 4 UI surfaces import from this layer)
  - DungeonGate.tsx, QuestBoard, WorkoutEngine, Arena.tsx (consumers in 13-02)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ollamaGenerate as shared fetch gateway — no prompt file calls fetch directly"
    - "format:'json' opt-in — only arenaPrompt passes it; plain text surfaces omit"
    - "aiCache module-level Map — session-scoped, no localStorage coupling"
    - "TypingText named export — matches existing system component pattern (StatBar, SystemWindow)"

key-files:
  created:
    - src/lib/ai/ollamaClient.ts
    - src/lib/ai/sessionCache.ts
    - src/lib/ai/prompts/bossPrompt.ts
    - src/lib/ai/prompts/questPrompt.ts
    - src/lib/ai/prompts/workoutPrompt.ts
    - src/lib/ai/prompts/arenaPrompt.ts
    - src/components/system/TypingText.tsx
  modified: []

key-decisions:
  - "OLLAMA_MODEL reads NEXT_PUBLIC_OLLAMA_MODEL env var, falls back to 'llama3' — single source of truth in ollamaClient.ts"
  - "AbortController timeout 5000ms — caller never waits longer; null returned silently on timeout"
  - "format:'json' is opt-in not default — plain text surfaces (boss/quest/workout) must not pass it to avoid Ollama forcing JSON output"
  - "arenaPrompt is the only JSON-structured surface — validates parsed shape before returning to prevent bad data reaching UI"
  - "aiCache lives at module level — survives component remount without React state, resets on page reload (no persistence intent)"
  - "TypingText resets animation when text prop changes — handles new AI content arriving mid-session"

patterns-established:
  - "Prompt files call ollamaGenerate — zero raw fetch calls outside ollamaClient.ts"
  - "All prompt functions return T | null — never throw, caller always does null-check before rendering"
  - "Named exports throughout — no default exports in system components or AI library"

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-03-19
---

# Phase 13 Plan 01: Ollama AI Integration — Infrastructure Layer Summary

**Shared Ollama client with 5s timeout, session cache, four typed prompt functions (boss/quest/workout/arena), and TypingText animation component — pure library layer, zero existing file modifications**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-19T07:41:38Z
- **Completed:** 2026-03-19T07:53:00Z
- **Tasks:** 3
- **Files modified:** 7 created, 0 modified

## Accomplishments
- `ollamaClient.ts` provides a single fetch gateway with AbortController timeout and env-driven model config
- `sessionCache.ts` provides module-level Map cache that survives remount and resets on page reload
- Four typed prompt functions each implementing THE SYSTEM voice pattern — null-safe with no raw fetch calls
- `TypingText` component animates characters one-by-one with a blinking cursor, resets on text prop change

## Task Commits

Each task was committed atomically:

1. **Task 1: ollamaClient.ts + sessionCache.ts** - `3e6cb54` (feat)
2. **Task 2: Four prompt functions** - `3935847` (feat)
3. **Task 3: TypingText component** - `60aff5b` (feat)

## Files Created/Modified
- `src/lib/ai/ollamaClient.ts` - Shared fetch utility: AbortController timeout, OLLAMA_MODEL env config, format:'json' opt-in
- `src/lib/ai/sessionCache.ts` - Module-level Map with get/set/has API for AI response caching
- `src/lib/ai/prompts/bossPrompt.ts` - generateBossBlurb(bossName, bossRank, playerRank) → Promise<string | null>
- `src/lib/ai/prompts/questPrompt.ts` - generateQuestLore(questName, difficulty, jobClass) → Promise<string | null>
- `src/lib/ai/prompts/workoutPrompt.ts` - generateWorkoutTagline(jobClass) → Promise<string | null>
- `src/lib/ai/prompts/arenaPrompt.ts` - generateArenaOpponent(playerRank) → Promise<ArenaOpponent | null>, format:'json', validates parsed shape
- `src/components/system/TypingText.tsx` - Named export, 'use client', animate-pulse cursor, resets on text change

## Decisions Made
- `format:'json'` is opt-in not default — arenaPrompt is the only surface that needs structured output; plain text surfaces must omit it to avoid Ollama wrapping responses in JSON
- `aiCache` at module level (not useState) — intentionally session-scoped with natural reset on page reload
- `arenaPrompt` validates the parsed shape (`typeof name === 'string' && typeof taunt === 'string'`) before returning — defends against malformed Ollama output

## Deviations from Plan

None — plan executed exactly as written. All 7 files created per specification. No existing files modified.

## Issues Encountered

None. Pre-existing TypeScript error in `src/__tests__/chapterMapping.test.ts` (TS2871 — unrelated to this plan) present before and after; ignored per scope boundary rule.

## User Setup Required

Optional: set `NEXT_PUBLIC_OLLAMA_MODEL` in `.env.local` to override the default `llama3` model. If Ollama is not running, all prompt functions return null silently — no app crashes.

## Next Phase Readiness
- All 7 library files ready for 13-02 UI wiring
- `aiCache` key conventions documented in `sessionCache.ts` header comments: `'boss:{bossId}'`, `'quest:{questId}'`, `'workout'`, `'arena:{battleStartedAt}'`
- Plan 13-02 can import directly: `import { generateBossBlurb } from '@/lib/ai/prompts/bossPrompt'`

---
*Phase: 13-ollama-ai-integration*
*Completed: 2026-03-19*
