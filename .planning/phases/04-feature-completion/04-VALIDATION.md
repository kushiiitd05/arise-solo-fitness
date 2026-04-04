---
phase: 4
slug: feature-completion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — UI-only phase, no test framework installed |
| **Config file** | none — no jest/vitest config present |
| **Quick run command** | `npx tsc --noEmit` (type-check only) |
| **Full suite command** | `npx tsc --noEmit && npx next build --no-lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit && npx next build --no-lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | 04-ARENA-GATE | manual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | 04-ARENA-GATE | manual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-01-03 | 01 | 1 | 04-MOBILE-NAV | manual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 2 | 04-ACHIEVEMENT-OVERLAY | manual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-02-02 | 02 | 2 | 04-GUILD-TAB | manual + tsc | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 04-02-03 | 02 | 2 | 04-GUILD-CLEANUP | manual | N/A — runtime behavior | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

No test framework installation required — this is a UI-only wiring phase. TypeScript compilation (`tsc --noEmit`) serves as the automated feedback gate. All behavioral verification is manual browser testing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Arena lock screen at Rank E | 04-ARENA-GATE | Conditional JSX, no test harness | Navigate to ARENA tab at Rank E — lock screen shows XP progress bar toward Rank D |
| Arena unlock flash + notification | 04-ARENA-GATE | Visual animation, auto-dismiss | Level up to level 10 — "COMBAT AUTHORIZATION GRANTED" notification appears, Arena.tsx renders |
| Mobile nav visible below lg | 04-MOBILE-NAV | CSS breakpoint, no test harness | Resize browser below lg breakpoint — 4-tab mobile nav appears at bottom |
| Mobile nav hidden above lg | 04-MOBILE-NAV | CSS breakpoint | Resize above lg — mobile nav hidden, desktop sidebar visible |
| Achievement overlay opens | 04-ACHIEVEMENT-OVERLAY | User interaction, animation | Click ACHIEVEMENTS card in STATUS panel — full-screen overlay slides in |
| Achievement overlay closes | 04-ACHIEVEMENT-OVERLAY | User interaction | Click close button — overlay closes, STATUS panel visible |
| Guild tab renders GuildHall | 04-GUILD-TAB | Component render | Click GUILD tab in desktop nav — GuildHall renders with chat |
| GuildHall cleanup on unmount | 04-GUILD-CLEANUP | Runtime Supabase subscription | Switch away from GUILD tab — no console errors about channel cleanup |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
