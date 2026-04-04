# Backend API Architecture Report
**Agent 3 | Stage 3 Output**

## Overview
The ARISE backend will rely heavily on Supabase for Auth and Realtime websockets, while a dedicated Node.js/Express server will handle complex background jobs, ML/AI workout generation, and secure validations.

## API Route Map

### 1. `[POST] /api/v1/auth/awakening`
- **Purpose**: First-time user registration flow ("Awakening").
- **Body**: `{ email, username, job_class_preference }`
- **Response**: `{ user: { id, hunter_rank: 'E', stats: {...} }, token }`
- **Middleware**: Rate Limiter (3/min), Zod Validation

### 2. `[GET] /api/v1/user/status-window`
- **Purpose**: Fetch all dashboard stats, current daily quests, unread notifications.
- **Response**: `{ stats: UserStat, daily_quest: DailyQuest, notifications: [Notification] }`
- **Auth**: Required Bearer JWT

### 3. `[POST] /api/v1/workouts/ai-generate`
- **Purpose**: Generates a custom workout via Gemini API based on user stats and available time.
- **Body**: `{ target_muscle_group, time_available_minutes, current_energy_level }`
- **AI Prompt injected by Backend**:
  > "You are the System from Solo Leveling. Generate a grueling workout for an E-Rank hunter targeting [target_muscle_group] that fits within [time_available_minutes] minutes. Return JSON strictly matching this schema: [{ exerciseId, name, sets, reps, recommendedWeight }]. No conversational text."
- **Response**: `[ { exercise_id, name, sets, reps, xp_reward } ]`

### 4. `[POST] /api/v1/workouts/log`
- **Purpose**: Submit completed workout data. Validates AR-verification signatures.
- **Body**: `{ workout_id, duration, exercises_completed: [], ar_verified_signature }`
- **Response**: `{ xp_earned, level_up_events: [], stat_increases: [] }`
- **Logic**: Trigger streak calculation, check if daily quest is satisfied, calculate XP based on curve formula.

### 5. `[GET] /api/v1/dungeons/active-gates`
- **Purpose**: Get live global dungeon gates available to enter.
- **Cache**: Redis or Memory Cache (updates every 15 minutes).

### 6. `[POST] /api/v1/webhooks/daily-reset`
- **Purpose**: Triggered via cron at midnight local time.
- **Logic**: 
  - Fail incomplete daily quests -> trigger Penalty Zone logic.
  - Reset daily tracker.
  - Generate new daily quests based on user level.

## WebSocket Realtime Structure (Supabase Realtime)
- **Channel `guild:[id]`**:
  - `presence`: Track who is currently online in the guild hall.
  - `broadcast`: `guild_chat` events.
- **Channel `pvp:matchmaking`**:
  - Emits `seeking_match` and `match_found`.
- **Channel `user:[id]`**:
  - Private notifications for "System Alerts" (e.g., "A Gate has opened nearby").

## XP / Gamification Engine Formulas
**Leveling Math**:
- `XP_REQUIRED_FOR_LEVEL(L) = Base_XP * (L ^ 1.5)`
- E-Rank (Lv 1-10) -> D-Rank (Lv 11-30) -> C-Rank (Lv 31-50) -> B-Rank (Lv 51-70) -> A-Rank (Lv 71-89) -> S-Rank (Lv 90-99) -> National (Lv 100).

**Daily Quest Penalty Zone**:
- If daily quest not completed:
  1. Temporary Debuff: All stat gains reduced by 50% for 24 hours.
  2. Forced Penalty Dungeon entry: User must run 5km or hold 3 min plank to clear debuff before starting standard workouts.

This concludes Agent 3 API Architecture. Moving to Frontend Phase 2.
