# ARISE — Solo Leveling Fitness System

## Project Overview
A full-stack gamified fitness application built on Next.js 16 + Supabase + TypeScript + Tailwind.
Users level up as hunters from the Solo Leveling universe by completing real-world workouts.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion
- **Backend**: Next.js API Routes (serverless), Supabase (PostgreSQL + Auth + Realtime)
- **State**: Zustand + useReducer (gameReducer)
- **Auth**: Supabase Auth (username→shadow email pattern + Google OAuth)
- **AI/Vision**: TensorFlow.js + MediaPipe (workout rep counting)
- **Deployment**: Vercel + Supabase Cloud

## Core Systems
1. Hunter progression (XP → Level → Rank E→S)
2. Daily quest system (push-ups, squats, sit-ups, running)
3. Shadow army extraction
4. Inventory / equipment
5. Boss raids (world bosses, level-gated)
6. Penalty zone (for missed daily quests)
7. Job classes (FIGHTER, ASSASSIN, TANK, MAGE, HEALER)
8. Chapter reader (manhwa reward system)

## Current Milestone
v1.0 — Stabilization & Core Gameplay Loop

## Key Files
- `src/app/page.tsx` — App entry, auth sync, session management
- `src/lib/gameReducer.ts` — Client state machine
- `src/lib/services/` — DB service layer
- `src/app/api/` — Server API routes
- `src/components/arise/Dashboard.tsx` — Main game UI
- `src/lib/game/xpEngine.ts` — XP/rank math engine
