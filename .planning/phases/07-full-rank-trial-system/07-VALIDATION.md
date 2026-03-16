---
phase: 7
slug: full-rank-trial-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 (installed in Phase 6) |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run src/lib/game/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/game/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | DB migration | manual | `npx supabase db diff` shows `trial_last_failed_at` | ✅ migration file | ⬜ pending |
| 07-01-02 | 01 | 1 | UserStats type + mapDb | unit | `npx vitest run --grep "trialLastFailedAt"` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | Trial targets helper | unit | `npx vitest run --grep "trialTargets"` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 2 | Profile INITIATE button | manual | Visual: button visible when dual-gate met, hidden otherwise | ✅ Profile.tsx | ⬜ pending |
| 07-01-05 | 01 | 2 | RankTrialEngine renders | manual | Visual: 4 exercise cards, correct 2× targets displayed | ❌ new file | ⬜ pending |
| 07-02-01 | 02 | 1 | /api/rank/advance route | unit | `npx vitest run --grep "rank/advance"` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 1 | Trial pass/fail logic | unit | `npx vitest run --grep "trialPass"` | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 2 | Cooldown notification | manual | Visual: SYSTEM notification fires on failure | ✅ notif system | ⬜ pending |
| 07-02-04 | 02 | 2 | RankUpCeremony renders | manual | Visual: badge reveal, reward summary, dismiss returns to Dashboard | ❌ new file | ⬜ pending |
| 07-02-05 | 02 | 2 | rank+stats written to DB | manual | Supabase Studio: hunter_rank updated, available_stat_points +5 | ✅ DB | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/game/xpEngine.test.ts` — add `trialTargets` tests (2× daily quest targets per rank/level)
- [ ] `src/app/api/rank/advance/route.test.ts` — stubs for dual-gate validation + rank write + XP dispatch
- [ ] `src/lib/gameReducer.test.ts` (or new file) — `trialLastFailedAt` mapping from DB → state
- [ ] `src/lib/game/trialEngine.test.ts` — pass/fail evaluation logic

*Wave 0 creates test stubs before the implementations are built.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| INITIATE TRIAL button eligibility | CONTEXT: dual-gate + cooldown check | UI state — no DOM test framework | Open Profile as eligible hunter; confirm button enabled. Open as ineligible (low XP); confirm button disabled. |
| RankTrialEngine 4-exercise flow | CONTEXT: all 4 at 2× targets | Requires MediaPipe webcam interaction | Start trial; verify 4 exercise cards display; verify first exercise rep counter starts at 0 and increments. |
| RankUpCeremony animation | CONTEXT: badge reveal, reward summary | Visual animation | Complete trial; confirm ceremony screen shows old→new rank, +5 stat points, correct XP bonus, dismiss works. |
| Cooldown timer display | CONTEXT: 24h lockout | Real-time countdown UI | Fail trial; reload page; confirm TRIAL LOCKED with HH:MM:SS countdown visible in Profile. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
