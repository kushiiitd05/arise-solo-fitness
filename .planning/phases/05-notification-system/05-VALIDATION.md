---
phase: 5
slug: notification-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / vitest (Next.js project) |
| **Config file** | `package.json` / `jest.config.js` (if present) |
| **Quick run command** | `npm run build -- --no-lint` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build -- --no-lint`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | Reducer fix | unit/build | `npm run build -- --no-lint` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | Component fix | build | `npm run build -- --no-lint` | ✅ | ⬜ pending |
| 05-02-01 | 02 | 2 | Quest wiring | build | `npm run build -- --no-lint` | ✅ | ⬜ pending |
| 05-02-02 | 02 | 2 | Rank-up wiring | build | `npm run build -- --no-lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test files needed — this is a bug-fix phase with TypeScript build as the automated signal.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Notification auto-dismisses after 4s | 05-01 | Requires browser timing | Trigger any notification; verify it disappears after ~4 seconds without interaction |
| Notification dismisses on click | 05-01 | Requires browser click | Click notification; verify immediate removal |
| Quest complete notification appears | 05-02 | Requires workout session | Complete all daily quests; verify green "Quests Complete" toast |
| Rank-up notification appears once | 05-02 | Requires rank threshold | Reach rank-up XP; verify exactly one notification (no duplicate) |
| No stuck notifications on page | 05-01 | Requires manual inspection | Complete multiple actions; verify no notifications remain stuck on screen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
