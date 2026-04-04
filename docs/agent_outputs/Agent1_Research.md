# Research Synthesizer Report
**Agent 1 | Stage 1 & 10 Output**

## Competitive Analysis & Inspiration
I have analyzed existing "Solo Leveling" themed fitness apps and gamification systems such as "Habitica".
- **Existing Apps**:
  - `IdkwhatImD0ing/SoloLeveling` - Good AR concept but Unity adds immense overhead for an app that should be a fast PWA/web app.
  - `MohammedTharick25/Solo-Leveling-System` - Good UI, lacks actual physiological integrations (workouts, real-time sensing).
  - `Habitica` - Great RPG mechanics but very generic task-master UI, not tailored strictly for intense physical fitness.

### Gap Analysis
Where existing tools fail:
- **No AR verification**: Apps rely on self-reporting which leads to "hollow" gamification where users input fake pushups to level up. ARISE solves this with TensorFlow.js + MediaPipe.
- **Generic Aesthetics**: Most flutter/react-native templates use bright generic anime styling rather than the **dark fantasy, deep blues/purples, sharp neon UI** required for genuine immersion.
- **Story-driven Rewards**: No fitness app rewards users with **exclusive, readable manhwa chapters**.

### Feature Prioritization matrix
| MVP (Phase 1) | V2 (Phase 2) | V3 (Phase 3) |
| :--- | :--- | :--- |
| Next.js Scaffold & Auth | AR Camera Integration (TF.js) | Manhwa Reader & Chapter Unlocks |
| Database Schema & Supabase RLS | PvP Realtime Battles (WebSockets) | Shadow Army Collectibles |
| User Profile & Rank display | Guild System & Chat | Seasonal "Gates" Events |
| Daily Quests (Manual verification) | AI Workout Generator | Advanced Achievements |

---

## Technical Resources & Component Library

### Design System & Assets
- **Primary Color Palette**: 
  - Backgrounds: `#0a0a0f`, `#12121c`
  - Accents: Neon Cyan (`#00f0ff`), System Blue (`#1e3a8a`), Error/Penalty Red (`#ff003c`)
  - Glow effects: `0 0 10px rgba(0, 240, 255, 0.5)`
- **Typography**: 
  - Primary UI: `Orbitron` (for numbers/levels/stats)
  - Body Text: `Inter` or `Exo 2`
- **UI Libraries**: `shadcn/ui` configured strictly for dark mode, combined with `framer-motion` for 'System Window' animations.

### API & Dependency Stack
- **Core Framework**: `Next.js 14` (App Router) + `React 18`
- **Backend/DB**: `Supabase` (Auth, Postgres, Realtime, Storage)
- **ORM**: `Prisma`
- **Client State**: `Zustand`
- **ML/AR**: `@tensorflow/tfjs`, `@mediapipe/pose`
- **Animation**: `framer-motion`

This concludes Agent 1's research packet. The blueprint now moves to Database Architecture (Agent 2).
