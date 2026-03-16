---
phase: 6
slug: rank-xp-calculation-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (to be installed in Wave 0) |
| **Config file** | vitest.config.ts — Wave 0 creates |
| **Quick run command** | `npx vitest run src/lib/game/xpEngine.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/game/xpEngine.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | rank-xp-engine | unit stub | `npx vitest run src/lib/game/xpEngine.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | rankFromLevelAndXp | unit | `npx vitest run src/lib/game/xpEngine.test.ts` | ✅ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | nextRankInfo helper | unit | `npx vitest run src/lib/game/xpEngine.test.ts` | ✅ W0 | ⬜ pending |
| 06-01-04 | 01 | 1 | reducer ADD_XP fix | unit | `npx vitest run src/lib/game/xpEngine.test.ts` | ✅ W0 | ⬜ pending |
| 06-01-05 | 01 | 1 | /api/xp/award route fix | integration | `npx vitest run src/lib/game/xpEngine.test.ts` | ✅ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | boss kill XP wiring | integration | `npx vitest run` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 2 | quest XP wiring | integration | `npx vitest run` | ✅ | ⬜ pending |
| 06-02-03 | 02 | 2 | rank progress bar UI | manual | see manual verifications | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/game/xpEngine.test.ts` — stubs for rankFromLevelAndXp, nextRankInfo, rank thresholds, reducer XP dispatch
- [ ] `vitest.config.ts` — basic vitest config for Next.js project
- [ ] `npx vitest` installed — add to devDependencies

*Wave 0 must complete before any Wave 1 tasks begin.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rank progress bar renders correctly | rank-progress-ui | Visual component, no DOM test harness | Load app, complete workout, verify progress bar advances between rank thresholds |
| Rank-up notification fires on threshold cross | rank-up-notify | Requires real Supabase + real XP event | Award XP to hit threshold, verify system window shows rank-up notification |

*Automated unit + integration tests cover the calculation engine. UI and notification events require manual spot-check.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
