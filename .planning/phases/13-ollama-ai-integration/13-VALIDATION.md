---
phase: 13
slug: ollama-ai-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
| **Config file** | vitest.config.ts (or package.json scripts) |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | Ollama client | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | Prompt templates | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | Session cache | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | TypingText component | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 2 | BossEvent wire | build | `npm run build` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 2 | QuestBoard wire | build | `npm run build` | ❌ W0 | ⬜ pending |
| 13-02-03 | 02 | 2 | WorkoutEngine wire | build | `npm run build` | ❌ W0 | ⬜ pending |
| 13-02-04 | 02 | 2 | Arena wire | build | `npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing TypeScript/Next.js infrastructure covers all phase requirements — no new test framework installs needed.

*All code is TypeScript. Type-checking via `tsc --noEmit` and build verification via `npm run build` are sufficient for this phase's output (no business logic to unit test, all surfaces are UI wiring + LLM calls).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Typing animation renders correctly | TypingText UX | Visual animation — can't assert in automated tests | Open each surface, verify text types in at ~20-30ms/char with blinking cursor |
| Ollama fallback on timeout | Silent fallback | Requires real Ollama to be offline or slow | Kill Ollama process, open BossEvent — static content should render, no error UI |
| Session cache works | No re-generation | Requires browser session state | Open same boss twice in one session — Ollama should NOT be called second time |
| THE SYSTEM voice | Flavor text quality | Qualitative assessment | Read generated text — should feel like Solo Leveling's THE SYSTEM narrator |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
