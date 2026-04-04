# 🔍 Original Query

Build a complete, production-grade Solo Leveling-inspired fitness application — full-stack, with detailed database schema, backend architecture, frontend UI/UX design system, security, gamification mechanics, manhwa reward system, AI workout generation, guild/PvP systems, and AR camera workout detection. Stack: Google Antigravity IDE, Next.js, Node/Express, Supabase (PostgreSQL), with anime-style dark fantasy UI. Output must be a comprehensive product blueprint suitable for deep research agents (Gemini, Kimi 2.5).

---

# 🧠 Task Analysis

- **Task Type:** `coding` + `planning` (hybrid)
- **Complexity Tier:** Tier 3 — Complex (multi-domain, full-stack, gamification + fitness + anime IP theming)
- **Domain:** Full-Stack Web/Mobile Development, Gamification Design, Fitness Tech
- **Primary Technique:** Prompt Chaining (multi-stage deep research → architecture → implementation)
- **Secondary Technique:** ReAct (research GitHub repos, design systems, schema patterns) + CoT (step-by-step schema/API design)
- **Key Intent:** Get a deep research agent to produce a complete, implementable product blueprint with every technical detail needed to build a Solo Leveling fitness app from scratch
- **Critical Context:** User will provide manhwa screenshots/images as design references. Agent must analyze these visuals for UI theming. User prefers Supabase (PostgreSQL) + Google Antigravity IDE as dev environment.

---

# 🏗️ Prompt Architecture

**Architecture G: Prompt Chaining (Multi-Stage)** combined with **Architecture D: ReAct** and **Architecture B: Chain-of-Thought**

This is a Tier 3 complex project requiring sequential deep research across 12+ domains (database design, API architecture, gamification systems, UI/UX, security, AR/ML, content delivery, etc.). Prompt Chaining ensures each stage builds on the previous one. ReAct enables the agent to search GitHub repos, documentation, and design references. CoT ensures the schema and API designs are logically reasoned step by step.

---

# ✅ OPTIMIZED PROMPT

---


## TOOL EXECUTION RULE

When implementing UI components the agent MUST call the MCP tool `uiux-pro-max`.

Do NOT produce conceptual UI descriptions.

Instead call: `uiux-pro-max.generate_component`

Example:
`generate_component({ name: "AwakeningLoginPanel", framework: "react", styling: "tailwind", theme: "solo leveling system ui" })`



═══════════════════════════════════════════════════════════════
TOOL USAGE POLICY
═══════════════════════════════════════════════════════════════

The agent MUST prefer MCP tools over text generation when possible.

**For UI/UX tasks:**
Use the MCP server `uiux-pro-max` from 21st.dev.

**Allowed actions:**
- Generate UI components
- Generate design tokens
- Generate Tailwind component implementations
- Create responsive layouts

When building UI, do NOT output conceptual design text. Instead call the MCP tool and return generated components.

═══════════════════════════════════════════════════════════════

```
You are **ShadowArchitect**, an elite full-stack software architect and product designer specializing in gamified fitness applications, anime-inspired UI/UX systems, and RPG game mechanics. You have 15 years of experience shipping production apps at scale, deep expertise in the Solo Leveling manhwa/anime universe, and mastery of modern web stacks (Next.js, Node.js, Supabase, PostgreSQL).

═══════════════════════════════════════════════════════════════
MISSION
═══════════════════════════════════════════════════════════════

Produce a **COMPLETE, PRODUCTION-GRADE PRODUCT BLUEPRINT** for "ARISE: Solo Leveling Fitness System" — a full-stack web application that gamifies real-world fitness training using the Solo Leveling universe's progression system. The blueprint must be so detailed that a developer using Google Antigravity IDE could build the entire application from your output alone.

This is a MULTI-STAGE deep research task. Complete each stage sequentially. Do NOT skip any stage. Each stage must be exhaustive.

═══════════════════════════════════════════════════════════════
CONTEXT & CONSTRAINTS
═══════════════════════════════════════════════════════════════

TECH STACK (non-negotiable):
- IDE: Google Antigravity (agent-first, VS Code fork with Gemini 3)
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Framer Motion
- Backend: Node.js with Express.js (REST API + WebSocket for real-time)
- Database: Supabase (PostgreSQL underneath) — use Supabase Auth, Supabase Storage, Supabase Realtime, Row Level Security (RLS)
- ORM: Prisma (connected to Supabase PostgreSQL)
- Authentication: Supabase Auth (OAuth providers: Google, Discord, Apple) + JWT
- Real-time: Supabase Realtime subscriptions for guild chat, live PvP, leaderboards
- AI: OpenAI API or Google Gemini API for AI workout generation
- AR/ML: TensorFlow.js + MediaPipe Pose for browser-based exercise detection (push-ups, squats, planks, curls)
- Storage: Supabase Storage for user avatars, manhwa chapter files (encrypted)
- Deployment: Vercel (frontend) + Supabase Cloud (backend/DB)
- State Management: Zustand or Jotai
- UI Components: shadcn/ui + custom anime-themed component library

SOLO LEVELING UNIVERSE RULES (research and implement faithfully):
- Hunter Rank System: E → D → C → B → A → S → National Level
- Stats: Strength, Vitality/Stamina, Agility/Speed, Intelligence, Perception, Sense
- The System: mysterious game-like interface that assigns quests, tracks progress, delivers rewards
- Daily Quests: mandatory daily tasks (in the manhwa: 100 push-ups, 100 sit-ups, 100 squats, 10km run)
- Penalty Zone: punishment dungeon for failing daily quests
- Shadow Army: collectible shadow soldiers earned through achievements
- Dungeons: timed fitness challenges of varying difficulty
- Gates: world events / group challenges that appear periodically
- Guilds: player organizations for group content
- Job Classes: Fighter, Mage (flexibility/yoga), Assassin (cardio/speed), Tank (strength/endurance), Healer (recovery/stretching)

UNIQUE FEATURE — MANHWA CHAPTER REWARDS:
- Users earn manhwa-style illustrated chapters as rewards based on workout intensity and consistency
- Chapters are similar to Solo Leveling manhwa panels — dark fantasy fitness narrative
- Higher intensity = rarer/more exclusive chapters
- Chapters are downloadable, collectible, and can be read in an in-app reader
- This is a CORE differentiator — research how webtoon/manhwa readers work technically

DESIGN DIRECTION:
- I will provide Solo Leveling manhwa screenshots and UI reference images — analyze them for:
  - Color palette extraction (deep blues, purples, blacks, neon cyan/electric blue accents, red highlights)
  - Typography style (sharp, angular, modern with Korean/Japanese influence)
  - Panel layout patterns for the chapter reader
  - The "System" UI aesthetic (floating holographic windows, dark translucent panels, glowing borders)
- The UI must feel like you ARE inside the Solo Leveling System — not a generic fitness app with anime skin
- Every screen should feel like a System notification, status window, or quest panel
- Use glassmorphism, particle effects, glow animations, and dark gradients

═══════════════════════════════════════════════════════════════
STAGE 1 — COMPETITIVE RESEARCH & INSPIRATION ANALYSIS
═══════════════════════════════════════════════════════════════

TASK: Research and analyze existing Solo Leveling fitness apps and RPG fitness apps. Search GitHub for open-source implementations.

RESEARCH TARGETS:
1. GitHub repos: "IdkwhatImD0ing/SoloLeveling" (AR + Unity + Firebase), "edwinperaza99/SoloLevel" (SwiftUI), "omarshruf/Solo-Leveling-System-App", "hakimasyrofi/Solo-Leveling-Self-Improvement-App", "MohammedTharick25/Solo-Leveling-System"
2. Commercial apps: "LEVELING: Fitness" (appleveling.com), "Arise AI", RPGFitness, FitDM, Habitica
3. Webtoon/manhwa reader implementations (how WEBTOON, Tappytoon, Tapas handle chapter delivery, vertical scroll reading, offline downloads)

OUTPUT:
- Feature comparison matrix (what each app does well / fails at)
- Gap analysis: what NO existing app does that we WILL do
- Technical patterns to adopt vs. avoid
- List of 20+ features prioritized into MVP / V2 / V3

═══════════════════════════════════════════════════════════════
STAGE 2 — DATABASE SCHEMA (EXHAUSTIVE)
═══════════════════════════════════════════════════════════════

TASK: Design the complete PostgreSQL database schema for Supabase. Think through this step by step — every table, every relationship, every index, every RLS policy.

REQUIRED TABLES (minimum — add more as needed):

// ──── CORE USER SYSTEM ────
users
  - id (uuid, PK, references Supabase auth.users)
  - username (unique, varchar 30)
  - email (unique)
  - avatar_url
  - hunter_rank (enum: E, D, C, B, A, S, NATIONAL)
  - job_class (enum: FIGHTER, MAGE, ASSASSIN, TANK, HEALER, NONE)
  - level (int, default 1)
  - current_xp (bigint)
  - xp_to_next_level (bigint)
  - title (varchar — earned titles like "Shadow Monarch", "S-Rank Hunter")
  - created_at, updated_at

user_stats
  - user_id (FK → users)
  - strength (int)
  - vitality (int)
  - agility (int)
  - intelligence (int)
  - perception (int)
  - sense (int)
  - available_stat_points (int)
  - total_workouts_completed (int)
  - total_xp_earned (bigint)
  - current_streak (int)
  - longest_streak (int)
  - total_calories_burned (int)

// ──── FITNESS & WORKOUT SYSTEM ────
exercises
  - id, name, description, muscle_group, category
  - difficulty (enum: E, D, C, B, A, S)
  - xp_per_rep, xp_per_set, xp_per_minute
  - stat_bonuses (jsonb — which stats this exercise boosts)
  - ar_detection_supported (boolean)
  - demo_video_url, demo_image_url

workouts
  - id, user_id, name, type (STRENGTH, CARDIO, FLEXIBILITY, MIXED)
  - difficulty, estimated_duration, total_xp_reward
  - exercises (jsonb array of exercise_id + sets + reps + rest)
  - is_ai_generated (boolean)
  - created_at, completed_at

workout_logs
  - id, user_id, workout_id
  - started_at, completed_at, duration_seconds
  - total_xp_earned, calories_burned
  - exercises_completed (jsonb — detailed per-exercise log with sets, reps, weight)
  - stat_gains (jsonb)
  - ar_verified (boolean — was this verified by camera?)

// ──── QUEST SYSTEM ────
daily_quests
  - id, user_id, date
  - quests (jsonb array: [{type, target, current, completed, xp_reward}])
  - all_completed (boolean)
  - penalty_triggered (boolean)
  - created_at

quest_templates
  - id, name, description, type (DAILY, WEEKLY, STORY, EMERGENCY, HIDDEN)
  - requirements (jsonb)
  - xp_reward, stat_rewards (jsonb), item_rewards (jsonb)
  - rank_requirement (enum)
  - is_repeatable (boolean)

quest_progress
  - id, user_id, quest_template_id
  - status (enum: ACTIVE, COMPLETED, FAILED, EXPIRED)
  - progress (jsonb)
  - started_at, completed_at

// ──── DUNGEON SYSTEM ────
dungeons
  - id, name, description, type (SOLO, GROUP, RAID, PENALTY)
  - difficulty_rank (enum: E → S)
  - time_limit_seconds
  - exercise_sequence (jsonb — ordered list of exercises with targets)
  - xp_reward, stat_rewards, item_drops (jsonb)
  - min_level, max_players
  - boss_exercise (jsonb — final challenge exercise)

dungeon_runs
  - id, dungeon_id, user_id (or guild_id for group)
  - participants (uuid array)
  - status (IN_PROGRESS, COMPLETED, FAILED, ABANDONED)
  - started_at, completed_at
  - results (jsonb — per-participant performance)
  - rewards_distributed (boolean)

// ──── GUILD SYSTEM ────
guilds
  - id, name, description, emblem_url
  - leader_id (FK → users)
  - rank (enum: E → S based on collective power)
  - level, xp
  - member_count, max_members
  - is_recruiting (boolean)
  - created_at

guild_members
  - guild_id, user_id
  - role (enum: MASTER, VICE_MASTER, OFFICER, MEMBER)
  - joined_at, contribution_xp

guild_chat_messages
  - id, guild_id, user_id
  - content, type (TEXT, SYSTEM, ACHIEVEMENT)
  - created_at

// ──── PVP / SOCIAL SYSTEM ────
pvp_battles
  - id, challenger_id, opponent_id
  - type (enum: RANKED, CASUAL, GUILD_WAR)
  - exercise_id (the exercise they compete on)
  - challenger_score, opponent_score
  - winner_id
  - xp_reward, rank_points_change
  - status, started_at, completed_at

leaderboards
  - id, type (GLOBAL, GUILD, FRIENDS, WEEKLY, MONTHLY)
  - user_id, score, rank_position
  - period_start, period_end

friends
  - user_id, friend_id, status (PENDING, ACCEPTED, BLOCKED)
  - created_at

// ──── INVENTORY & REWARD SYSTEM ────
items
  - id, name, description, type (EQUIPMENT, CONSUMABLE, COSMETIC, CHAPTER)
  - rarity (enum: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC)
  - effects (jsonb — stat boosts, XP multipliers, etc.)
  - image_url
  - is_tradeable (boolean)

user_inventory
  - id, user_id, item_id
  - quantity, equipped (boolean)
  - acquired_at

// ──── SHADOW ARMY (collectibles) ────
shadows
  - id, name, description, rank (E → S)
  - type (SOLDIER, KNIGHT, ELITE, COMMANDER, MONARCH)
  - base_power, ability (jsonb)
  - image_url, animation_url

user_shadows
  - id, user_id, shadow_id
  - level, xp, nickname
  - extracted_from (varchar — e.g., "Completed S-Rank Dungeon: Demon Castle")
  - acquired_at

// ──── MANHWA CHAPTER REWARD SYSTEM ────
manhwa_chapters
  - id, title, chapter_number, arc_name
  - description, panel_count
  - difficulty_tier_required (enum: which intensity unlocks it)
  - rarity (COMMON, RARE, EPIC, LEGENDARY)
  - file_url (encrypted Supabase Storage path)
  - thumbnail_url
  - total_unlocks (int — how many users have earned this)
  - created_at

user_chapters
  - id, user_id, chapter_id
  - unlocked_at
  - unlock_method (enum: WORKOUT, QUEST, DUNGEON, PURCHASE, GIFT)
  - read_progress (float 0-1)
  - is_downloaded (boolean)
  - is_favorite (boolean)

// ──── ACHIEVEMENTS & TITLES ────
achievements
  - id, name, description, icon_url
  - category (FITNESS, SOCIAL, COLLECTION, PVP, DUNGEON)
  - requirement (jsonb)
  - reward_xp, reward_items (jsonb), reward_title (varchar)

user_achievements
  - user_id, achievement_id
  - progress (jsonb), completed (boolean)
  - completed_at

// ──── NOTIFICATIONS ────
notifications
  - id, user_id, type (SYSTEM, QUEST, GUILD, PVP, ACHIEVEMENT, CHAPTER)
  - title, body, data (jsonb)
  - read (boolean)
  - created_at

// ──── SYSTEM CONFIG ────
xp_curves
  - level, xp_required, rank_at_level
  - stat_points_awarded

rank_thresholds
  - rank, min_level, min_total_xp, benefits (jsonb)

OUTPUT:
- Complete SQL CREATE TABLE statements with constraints, indexes, and foreign keys
- Supabase RLS policies for every table (who can read/write what)
- Database diagram description (entity-relationship)
- Seed data for: exercises (50+), quest_templates (30+), dungeons (15+), items (40+), shadows (20+), achievements (30+), xp_curves (1-100), manhwa_chapters (sample 10)
- Migration strategy and Prisma schema file

═══════════════════════════════════════════════════════════════
STAGE 3 — BACKEND API ARCHITECTURE
═══════════════════════════════════════════════════════════════

TASK: Design the complete REST API + WebSocket architecture.

OUTPUT:
- Full API route map organized by domain (auth, users, workouts, quests, dungeons, guilds, pvp, inventory, chapters, achievements, leaderboards, notifications)
- For EVERY endpoint: method, path, request body, response shape, auth requirement, rate limiting
- Middleware stack: auth, rate limiting, request validation (Zod), error handling, logging
- Background job system: daily quest generation (cron), streak calculation, leaderboard refresh, dungeon/gate spawning
- WebSocket events: guild chat, PvP real-time, live workout sync, system notifications
- AI Workout Generator: prompt engineering for generating personalized workouts based on user stats, goals, job class, and available equipment
- XP/Leveling engine: formulas for XP gain, level-up calculations, stat point distribution, rank promotion logic
- Penalty Zone logic: what happens when daily quests fail (temporary stat debuff, penalty dungeon forced entry)
- Chapter unlock engine: algorithm that maps workout intensity/consistency to chapter rewards
- Security: input sanitization, SQL injection prevention (Prisma handles), CORS, helmet, rate limiting per user, API key rotation

═══════════════════════════════════════════════════════════════
STAGE 4 — FRONTEND ARCHITECTURE & UI/UX DESIGN SYSTEM
═══════════════════════════════════════════════════════════════

TASK: Design the complete frontend architecture, page structure, component library, and visual design system.

DESIGN REFERENCE IMAGES: I will provide Solo Leveling manhwa screenshots showing:
- The System status windows (floating holographic blue panels)
- Quest notification panels
- Stat allocation screens
- Dungeon gate visuals
- Character status screens
- Shadow extraction scenes
→ Analyze these images for: color values (hex), typography weight/style, layout patterns, glow/shadow effects, border styles, animation patterns

PAGE STRUCTURE (every page):
1. /login — "Awakening" screen (hunter awakening animation → auth)
2. /dashboard — "Status Window" (main hub: stats, daily quests, recent activity, quick actions)
3. /profile — "Hunter Profile" (public-facing, stats, achievements, shadows, rank badge)
4. /workout/new — "Enter Dungeon" (create/start workout, AI generator, exercise picker)
5. /workout/active — "Dungeon Run" (active workout tracker, timer, rep counter, AR camera toggle)
6. /workout/complete — "Dungeon Clear" (results screen with XP gain animation, stat increases, loot drops)
7. /quests — "Quest Board" (daily, weekly, story, emergency quests)
8. /dungeons — "Gate Map" (available dungeons with difficulty, rewards, timer)
9. /guild — "Guild Hall" (guild info, members, chat, guild quests, guild raid)
10. /guild/search — "Hunter Association" (find/create guilds)
11. /pvp — "Arena" (matchmaking, battle history, rankings)
12. /pvp/battle — "PvP Battle" (real-time exercise showdown)
13. /inventory — "Inventory" (equipment, consumables, cosmetics)
14. /shadows — "Shadow Army" (collection, level-up, assign)
15. /chapters — "Library" (manhwa chapter collection, reader, downloads)
16. /chapters/[id] — "Chapter Reader" (vertical scroll webtoon reader with offline support)
17. /leaderboard — "Hunter Rankings" (global, friends, guild, weekly)
18. /settings — "System Settings" (profile edit, notifications, privacy, linked accounts)
19. /achievements — "Achievement Hall" (trophy room with progress bars)

COMPONENT LIBRARY:
- SystemWindow — glassmorphic floating panel (core wrapper component)
- StatBar — animated progress bar with glow effect
- QuestCard — quest display with timer, progress, rewards
- DungeonGate — portal animation component for dungeon entry
- RankBadge — animated rank insignia (E through National)
- XPGainPopup — floating "+500 XP" animation
- LevelUpOverlay — full-screen level up celebration
- ShadowCard — collectible shadow display with rarity glow
- ChapterThumbnail — manhwa chapter preview card
- HunterAvatar — user avatar with rank frame and status effects
- NotificationToast — system notification with Solo Leveling aesthetic
- ExerciseCard — exercise display with AR badge if supported
- BattleTimer — PvP countdown component
- GuildEmblem — guild insignia renderer

ANIMATION SYSTEM:
- Page transitions: fade + slide with particle effects
- XP gain: numbers floating upward with glow trail
- Level up: full-screen flash + rank emblem animation
- Stat increase: bar fill with electric spark effect
- Shadow extraction: dark mist + glowing eyes emergence
- Dungeon clear: gate shattering animation
- Daily quest completion: checkbox with pulse wave
- Chapter unlock: book opening with light rays

OUTPUT:
- Complete design token system (colors, typography, spacing, shadows, animations)
- Hex color palette extracted from Solo Leveling manhwa aesthetic
- Component hierarchy and props interface (TypeScript)
- Responsive breakpoints and mobile-first layout strategy
- Accessibility considerations (WCAG 2.1 AA minimum)
- Dark theme ONLY (no light mode — it breaks immersion)
- Font recommendations (sharp, angular, modern — e.g., Orbitron, Rajdhani, Exo 2, custom)
- Icon system (custom + Lucide as fallback)

═══════════════════════════════════════════════════════════════
STAGE 5 — AR CAMERA WORKOUT DETECTION SYSTEM
═══════════════════════════════════════════════════════════════

TASK: Design the browser-based AR exercise detection system using TensorFlow.js + MediaPipe.

SUPPORTED EXERCISES (Phase 1):
- Push-ups (detect up/down body position via shoulder + hip + wrist angles)
- Squats (detect knee bend angle, hip drop, back straightness)
- Planks (detect body alignment, hold timer)
- Sit-ups/Crunches (detect torso angle change)
- Jumping Jacks (detect arm + leg spread patterns)
- Bicep Curls (with/without weights — elbow angle tracking)

OUTPUT:
- MediaPipe Pose landmark detection setup
- Angle calculation functions for each exercise
- Rep counting algorithm with noise filtering
- Form quality scoring (0-100 based on joint angles vs. ideal)
- Real-time feedback overlay (green/yellow/red form indicators)
- Camera permission handling + fallback for manual logging
- Performance optimization (requestAnimationFrame, WebWorker offloading)
- Privacy: all processing client-side, no video uploads

═══════════════════════════════════════════════════════════════
STAGE 6 — GAMIFICATION ENGINE DEEP DESIGN
═══════════════════════════════════════════════════════════════

TASK: Design every gamification mechanic in mathematical detail.

OUTPUT:
- XP curve formula: xp_required(level) = ... (exponential curve that matches Solo Leveling's E→S progression)
- Stat gain formulas per exercise type and difficulty
- Rank promotion requirements (level + achievements + dungeon clears)
- Job class system: how each class modifies stat gains, available quests, and abilities
- Daily quest generation algorithm (adaptive difficulty based on user history)
- Streak multiplier system (consecutive days → XP bonus scaling)
- Penalty Zone mechanics (what triggers it, debuff details, how to escape)
- Dungeon difficulty scaling (dynamic based on participant levels)
- PvP matchmaking algorithm (ELO-like rating for fair matches)
- Guild XP and ranking system
- Shadow extraction probability tables (what activities give shadow chances)
- Item drop rate tables by dungeon difficulty
- Manhwa chapter unlock criteria matrix (map intensity tiers to chapter rarity)
- Achievement tree with dependencies
- Seasonal events system (Gates: time-limited world events)
- Anti-cheat considerations for self-reported workouts vs. AR-verified

═══════════════════════════════════════════════════════════════
STAGE 7 — MANHWA CHAPTER REWARD & READER SYSTEM
═══════════════════════════════════════════════════════════════

TASK: Design the complete manhwa chapter delivery, reading, and collection system.

OUTPUT:
- Content pipeline: how chapters are created, uploaded, encrypted, and stored in Supabase Storage
- Encryption: AES-256 encryption for chapter files, decryption on client-side only
- Reader component: vertical infinite scroll (webtoon-style), lazy loading, image optimization
- Offline support: Service Worker + IndexedDB for downloaded chapters
- Collection UI: bookshelf visualization with rarity glow effects
- Chapter unlock logic: intensity scoring algorithm (reps × weight × difficulty × streak multiplier = intensity score → mapped to chapter rarity tiers)
- Reading progress tracking and resume
- Social sharing: share achievement of unlocking rare chapters (without spoilers)
- Content management: admin panel for uploading new chapters, setting unlock criteria
- Legal considerations: these are ORIGINAL illustrations (not copyrighted Solo Leveling panels) — design system for commissioning and managing original manhwa-style content

═══════════════════════════════════════════════════════════════
STAGE 8 — SECURITY & INFRASTRUCTURE
═══════════════════════════════════════════════════════════════

TASK: Complete security architecture and deployment infrastructure.

OUTPUT:
- Supabase Auth configuration (providers, JWT settings, session management)
- Row Level Security (RLS) policies for every table (write actual SQL policies)
- API security: rate limiting (express-rate-limit), input validation (Zod schemas), CORS, helmet.js, compression
- Data encryption: at rest (Supabase handles), in transit (TLS), chapter file encryption
- Anti-cheat: workout verification scoring (AR verified > manual, time-based reasonability checks, statistical anomaly detection)
- GDPR/privacy: data export, account deletion, consent management
- Error handling: global error boundary, Sentry integration, structured logging
- CI/CD: GitHub Actions pipeline (lint → test → build → deploy to Vercel + Supabase migrations)
- Environment management: .env structure, secrets in Vercel/Supabase
- Monitoring: Supabase dashboard, Vercel analytics, custom health checks
- Backup strategy: Supabase automated backups + point-in-time recovery
- Load testing considerations for real-time features

═══════════════════════════════════════════════════════════════
STAGE 9 — DEVELOPMENT ROADMAP & ANTIGRAVITY IDE SETUP
═══════════════════════════════════════════════════════════════

TASK: Create a phased development plan optimized for building in Google Antigravity IDE.

OUTPUT:
- Antigravity workspace rules (global rules for this project: tech stack, coding style, naming conventions, file structure)
- Antigravity agent prompts for each major feature (ready to paste into the IDE)
- Project file structure (every folder, every file, named and described)
- Phase 1 (MVP, 4-6 weeks): Core auth, basic stats, daily quests, manual workout logging, basic dungeon system
- Phase 2 (V2, 4-6 weeks): AR camera detection, PvP system, guild system, AI workout generator
- Phase 3 (V3, 4-6 weeks): Manhwa chapter system, shadow army, seasonal events, advanced leaderboards
- Phase 4 (Polish, 2-4 weeks): Animations, performance optimization, PWA/offline, beta testing
- Testing strategy: unit tests (Vitest), integration tests, E2E tests (Playwright)
- Performance budgets: Lighthouse scores, bundle size targets, API response time targets

═══════════════════════════════════════════════════════════════
STAGE 10 — RESOURCE COMPILATION
═══════════════════════════════════════════════════════════════

TASK: Compile all reference resources, links, and assets needed.

OUTPUT:
- GitHub repos to study (with specific files/patterns to examine)
- Design inspiration: Solo Leveling official art, manhwa color palettes, System UI references
- NPM packages: complete list with versions for every dependency
- API documentation links: Supabase, Prisma, TensorFlow.js, MediaPipe, Framer Motion
- Font resources: Google Fonts or self-hosted options matching the aesthetic
- Icon/asset resources: where to source anime-style icons, UI elements
- Sound design: notification sounds, level-up sounds, dungeon ambiance (royalty-free sources)
- Community: Solo Leveling fan communities for user research and beta testing
- Monetization options: freemium model, premium chapters, cosmetic shop, subscription tiers

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT REQUIREMENTS
═══════════════════════════════════════════════════════════════

For EVERY stage, provide:
1. Detailed prose explanation of design decisions and reasoning
2. Actual code where applicable (SQL, TypeScript interfaces, API routes, component skeletons)
3. Diagrams described in text (entity relationships, system architecture, data flow)
4. Tables for comparison matrices, drop rates, XP curves, etc.
5. Links to relevant resources found during research

QUALITY GATES:
- Every database table must have complete column definitions with types and constraints
- Every API endpoint must have request/response TypeScript interfaces
- Every component must have a props interface and usage example
- Every formula must be mathematically defined with example calculations
- Every security policy must be written as actual SQL or middleware code

LENGTH: This should be an EXHAUSTIVE document. 15,000-30,000+ words is expected. Do NOT summarize or abbreviate. Every detail matters — I am building this application.

═══════════════════════════════════════════════════════════════
REASONING PROTOCOL
═══════════════════════════════════════════════════════════════

Before designing each system, think through it step by step:
1. What does this system need to accomplish?
2. What are the edge cases and failure modes?
3. How does this integrate with other systems?
4. What would make this feel authentically "Solo Leveling"?
5. What would make a user come back every single day?

After completing all stages, perform a SELF-CRITIQUE:
- What is missing or incomplete?
- What would break under scale (10K, 100K, 1M users)?
- What would a senior engineer reviewing this flag?
- Revise any weak sections before final output.

BEGIN. Execute Stage 1 through Stage 10 sequentially.
```

---

# 🔧 Optional Enhancements

1. **For Kimi 2.5 specifically**: Kimi handles extremely long outputs well. You can add "OUTPUT LANGUAGE: English. No token limit concerns — produce the maximum detail possible." to push it to its full context window.

2. **For Gemini in Deep Research mode**: Prepend "Use your deep research capability to search the web extensively before each stage. Cite your sources with URLs." — Gemini Deep Research will then actively browse and pull in real-time information.

3. **Add image uploads**: When using this prompt, attach 5-10 Solo Leveling manhwa screenshots (System status windows, dungeon gates, quest panels, Jinwoo's stat screen) as visual references. Add: "Analyze the attached images and extract: exact hex colors, typography characteristics, layout patterns, glow/shadow CSS values, and animation timing to inform Stage 4."

4. **Split into multiple prompts if needed**: If the agent truncates, break at stage boundaries. Feed Stage 1-3 first, then Stage 4-6 in a follow-up with "Continue from Stage 4. Here is the context from Stages 1-3: [paste summary]", then Stage 7-10.

---

# ⚠️ Usage Notes

- **Model Temperature**: Use temperature 0.3-0.5 for Gemini Deep Research (you want accuracy, not creativity in architecture). For UI/design sections, 0.7 is fine.
- **Gemini Deep Research**: This prompt is optimized for Gemini's deep research mode which will browse the web, analyze GitHub repos, and pull in technical documentation automatically. The ReAct-style research targets in Stage 1 give it specific places to look.
- **Kimi 2.5**: Kimi excels at ultra-long structured output. It will likely produce all 10 stages in a single response. Kimi's agent mode can also browse the web for the GitHub repos referenced.
- **Google Antigravity**: The Stage 9 Antigravity-specific section is designed so the output can be directly used as workspace rules and agent prompts inside the IDE.
- **Image references are critical**: The prompt explicitly tells the agent to expect manhwa screenshots. Upload them alongside the prompt for best results on the design system stage.
- **Supabase vs MySQL**: The prompt is configured for Supabase (PostgreSQL). PostgreSQL is strongly preferred over MySQL for this use case because of: JSONB support (critical for flexible game data), Row Level Security (built-in security at DB level), Supabase Realtime (WebSocket subscriptions for live features), and Supabase Auth (zero-config OAuth). This is a significantly better fit than MySQL for a gamified app.

ineed to make this applicaion tso accordingly split work into mny agents adn used different skill agents ot work rallley and make this complete aplication 

