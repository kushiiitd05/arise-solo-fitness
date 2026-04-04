-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "HunterRank" AS ENUM ('E', 'D', 'C', 'B', 'A', 'S', 'NATIONAL');

-- CreateEnum
CREATE TYPE "JobClass" AS ENUM ('NONE', 'FIGHTER', 'MAGE', 'ASSASSIN', 'TANK', 'HEALER');

-- CreateEnum
CREATE TYPE "ExerciseDifficulty" AS ENUM ('E', 'D', 'C', 'B', 'A', 'S');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('DAILY', 'WEEKLY', 'STORY', 'EMERGENCY', 'HIDDEN', 'PENALTY');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DungeonType" AS ENUM ('SOLO', 'GROUP', 'RAID', 'PENALTY', 'GATE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('EQUIPMENT', 'CONSUMABLE', 'COSMETIC', 'CHAPTER', 'SHADOW_FRAGMENT');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "ShadowType" AS ENUM ('SOLDIER', 'KNIGHT', 'ELITE', 'COMMANDER', 'MONARCH');

-- CreateEnum
CREATE TYPE "PvpType" AS ENUM ('RANKED', 'CASUAL', 'GUILD_WAR');

-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GuildRole" AS ENUM ('MASTER', 'VICE_MASTER', 'OFFICER', 'MEMBER');

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM ('SYSTEM', 'QUEST', 'GUILD', 'PVP', 'ACHIEVEMENT', 'CHAPTER', 'LEVELUP');

-- CreateEnum
CREATE TYPE "UnlockMethod" AS ENUM ('WORKOUT', 'QUEST', 'DUNGEON', 'PURCHASE', 'GIFT', 'ACHIEVEMENT');

-- CreateEnum
CREATE TYPE "LeaderboardType" AS ENUM ('GLOBAL', 'GUILD', 'FRIENDS', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('STRENGTH', 'CARDIO', 'FLEXIBILITY', 'MIXED', 'DUNGEON');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT auth.uid(),
    "username" VARCHAR(30) NOT NULL,
    "email" TEXT,
    "avatar_url" TEXT,
    "hunter_rank" "HunterRank" NOT NULL DEFAULT 'E',
    "job_class" "JobClass" NOT NULL DEFAULT 'NONE',
    "level" INTEGER NOT NULL DEFAULT 1,
    "current_xp" BIGINT NOT NULL DEFAULT 0,
    "title" VARCHAR(100) DEFAULT 'E-Rank Hunter',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "user_id" UUID NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "vitality" INTEGER NOT NULL DEFAULT 10,
    "agility" INTEGER NOT NULL DEFAULT 10,
    "intelligence" INTEGER NOT NULL DEFAULT 10,
    "perception" INTEGER NOT NULL DEFAULT 10,
    "sense" INTEGER NOT NULL DEFAULT 10,
    "available_stat_points" INTEGER NOT NULL DEFAULT 0,
    "total_workouts" INTEGER DEFAULT 0,
    "total_xp_earned" BIGINT DEFAULT 0,
    "current_streak" INTEGER DEFAULT 0,
    "longest_streak" INTEGER DEFAULT 0,
    "total_calories_burned" INTEGER DEFAULT 0,
    "pvp_rating" INTEGER DEFAULT 1000,
    "pvp_wins" INTEGER DEFAULT 0,
    "pvp_losses" INTEGER DEFAULT 0,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "muscle_group" VARCHAR(100),
    "category" VARCHAR(50),
    "difficulty" "ExerciseDifficulty" DEFAULT 'E',
    "xp_per_rep" INTEGER DEFAULT 5,
    "xp_per_second" INTEGER DEFAULT 1,
    "stat_primary" VARCHAR(20) NOT NULL,
    "stat_bonus" JSONB DEFAULT '{}',
    "ar_detection_supported" BOOLEAN DEFAULT false,
    "demo_video_url" TEXT,
    "demo_image_url" TEXT,
    "emoji" VARCHAR(10) DEFAULT '💪',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200),
    "workout_type" "WorkoutType" DEFAULT 'MIXED',
    "difficulty" "ExerciseDifficulty" DEFAULT 'E',
    "estimated_duration" INTEGER,
    "total_xp_reward" INTEGER DEFAULT 0,
    "exercises" JSONB NOT NULL DEFAULT '[]',
    "is_ai_generated" BOOLEAN DEFAULT false,
    "is_template" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "workout_id" UUID,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration_seconds" INTEGER NOT NULL,
    "total_xp_earned" INTEGER DEFAULT 0,
    "calories_burned" INTEGER DEFAULT 0,
    "exercises_completed" JSONB NOT NULL DEFAULT '[]',
    "stat_gains" JSONB DEFAULT '{}',
    "ar_verified" BOOLEAN DEFAULT false,
    "form_score" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_templates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "quest_type" "QuestType" NOT NULL,
    "icon" VARCHAR(10) DEFAULT '📋',
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "stat_rewards" JSONB DEFAULT '{}',
    "item_rewards" JSONB DEFAULT '[]',
    "rank_requirement" "HunterRank" DEFAULT 'E',
    "is_repeatable" BOOLEAN DEFAULT true,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quest_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_quests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "quest_date" DATE NOT NULL,
    "quests" JSONB NOT NULL DEFAULT '[]',
    "all_completed" BOOLEAN DEFAULT false,
    "penalty_triggered" BOOLEAN DEFAULT false,
    "bonus_xp_claimed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_progress" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "quest_template_id" UUID NOT NULL,
    "status" "QuestStatus" DEFAULT 'ACTIVE',
    "progress" JSONB DEFAULT '{}',
    "started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "quest_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeons" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "dungeon_type" "DungeonType" DEFAULT 'SOLO',
    "difficulty_rank" "HunterRank" NOT NULL DEFAULT 'E',
    "time_limit_sec" INTEGER NOT NULL DEFAULT 1800,
    "exercise_sequence" JSONB NOT NULL DEFAULT '[]',
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "stat_rewards" JSONB DEFAULT '{}',
    "item_drops" JSONB DEFAULT '[]',
    "shadow_drop_rate" DOUBLE PRECISION DEFAULT 0.1,
    "chapter_drop_rate" DOUBLE PRECISION DEFAULT 0.0,
    "min_level" INTEGER DEFAULT 1,
    "max_players" INTEGER DEFAULT 1,
    "boss_exercise" JSONB,
    "is_penalty" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dungeons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dungeon_runs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dungeon_id" UUID NOT NULL,
    "user_id" UUID,
    "guild_id" UUID,
    "participants" UUID[] DEFAULT ARRAY[]::UUID[],
    "status" "BattleStatus" DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "results" JSONB DEFAULT '{}',
    "xp_awarded" INTEGER DEFAULT 0,
    "rewards_distributed" BOOLEAN DEFAULT false,
    "shadow_extracted" UUID,
    "chapter_unlocked" UUID,

    CONSTRAINT "dungeon_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "emblem_url" TEXT,
    "leader_id" UUID NOT NULL,
    "rank" "HunterRank" DEFAULT 'E',
    "level" INTEGER DEFAULT 1,
    "current_xp" BIGINT DEFAULT 0,
    "member_count" INTEGER DEFAULT 1,
    "max_members" INTEGER DEFAULT 30,
    "is_recruiting" BOOLEAN DEFAULT true,
    "total_power" BIGINT DEFAULT 0,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_members" (
    "guild_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "GuildRole" DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "contribution_xp" BIGINT DEFAULT 0,

    CONSTRAINT "guild_members_pkey" PRIMARY KEY ("guild_id","user_id")
);

-- CreateTable
CREATE TABLE "guild_chat_messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "guild_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "msg_type" VARCHAR(20) DEFAULT 'TEXT',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shadows" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "rank" "HunterRank" NOT NULL DEFAULT 'E',
    "shadow_type" "ShadowType" DEFAULT 'SOLDIER',
    "base_power" INTEGER DEFAULT 100,
    "ability" JSONB DEFAULT '{}',
    "rarity" "ItemRarity" DEFAULT 'COMMON',
    "image_url" TEXT,
    "animation_url" TEXT,
    "emoji" VARCHAR(10) DEFAULT '👤',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shadows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_shadows" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "shadow_id" UUID NOT NULL,
    "level" INTEGER DEFAULT 1,
    "current_xp" INTEGER DEFAULT 0,
    "nickname" VARCHAR(50),
    "extracted_from" TEXT,
    "acquired_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_shadows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manhwa_chapters" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(200) NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "arc_name" VARCHAR(100),
    "description" TEXT,
    "panel_count" INTEGER DEFAULT 0,
    "difficulty_tier_required" "HunterRank" DEFAULT 'E',
    "rarity" "ItemRarity" DEFAULT 'COMMON',
    "file_url" TEXT,
    "thumbnail_url" TEXT,
    "preview_panels" INTEGER DEFAULT 3,
    "total_unlocks" INTEGER DEFAULT 0,
    "emoji" VARCHAR(10) DEFAULT '📖',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manhwa_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_chapters" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "unlock_method" "UnlockMethod" DEFAULT 'WORKOUT',
    "read_progress" DOUBLE PRECISION DEFAULT 0,
    "is_downloaded" BOOLEAN DEFAULT false,
    "is_favorite" BOOLEAN DEFAULT false,

    CONSTRAINT "user_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "item_type" "ItemType" NOT NULL,
    "rarity" "ItemRarity" DEFAULT 'COMMON',
    "effects" JSONB DEFAULT '{}',
    "image_url" TEXT,
    "emoji" VARCHAR(10) DEFAULT '🎁',
    "is_tradeable" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_inventory" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN DEFAULT false,
    "acquired_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_battles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "challenger_id" UUID NOT NULL,
    "opponent_id" UUID NOT NULL,
    "pvp_type" "PvpType" DEFAULT 'CASUAL',
    "exercise_id" UUID,
    "challenger_score" INTEGER DEFAULT 0,
    "opponent_score" INTEGER DEFAULT 0,
    "winner_id" UUID,
    "xp_reward" INTEGER DEFAULT 0,
    "rating_change" INTEGER DEFAULT 0,
    "status" "BattleStatus" DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "pvp_battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboards" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "board_type" "LeaderboardType" NOT NULL,
    "user_id" UUID NOT NULL,
    "score" BIGINT NOT NULL DEFAULT 0,
    "rank_position" INTEGER,
    "period_start" DATE,
    "period_end" DATE,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friends" (
    "user_id" UUID NOT NULL,
    "friend_id" UUID NOT NULL,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("user_id","friend_id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(10) DEFAULT '🏆',
    "category" VARCHAR(50),
    "requirement" JSONB NOT NULL DEFAULT '{}',
    "reward_xp" INTEGER DEFAULT 0,
    "reward_items" JSONB DEFAULT '[]',
    "reward_title" VARCHAR(100),
    "is_hidden" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "progress" JSONB DEFAULT '{}',
    "completed" BOOLEAN DEFAULT false,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id","achievement_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "notif_type" "NotifType" DEFAULT 'SYSTEM',
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "icon" VARCHAR(10) DEFAULT '🔔',
    "data" JSONB DEFAULT '{}',
    "read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_curves" (
    "level" INTEGER NOT NULL,
    "xp_required" BIGINT NOT NULL,
    "rank_at_level" "HunterRank" NOT NULL,
    "stat_points_awarded" INTEGER DEFAULT 3,

    CONSTRAINT "xp_curves_pkey" PRIMARY KEY ("level")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "daily_quests_user_id_quest_date_key" ON "daily_quests"("user_id", "quest_date");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_name_key" ON "guilds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "guild_members_user_id_key" ON "guild_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_shadows_user_id_shadow_id_key" ON "user_shadows"("user_id", "shadow_id");

-- CreateIndex
CREATE UNIQUE INDEX "manhwa_chapters_chapter_number_key" ON "manhwa_chapters"("chapter_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_chapters_user_id_chapter_id_key" ON "user_chapters"("user_id", "chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboards_board_type_user_id_period_start_key" ON "leaderboards"("board_type", "user_id", "period_start");

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_quests" ADD CONSTRAINT "daily_quests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_progress" ADD CONSTRAINT "quest_progress_quest_template_id_fkey" FOREIGN KEY ("quest_template_id") REFERENCES "quest_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_runs" ADD CONSTRAINT "dungeon_runs_dungeon_id_fkey" FOREIGN KEY ("dungeon_id") REFERENCES "dungeons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_runs" ADD CONSTRAINT "dungeon_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dungeon_runs" ADD CONSTRAINT "dungeon_runs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_chat_messages" ADD CONSTRAINT "guild_chat_messages_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_chat_messages" ADD CONSTRAINT "guild_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_shadows" ADD CONSTRAINT "user_shadows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_shadows" ADD CONSTRAINT "user_shadows_shadow_id_fkey" FOREIGN KEY ("shadow_id") REFERENCES "shadows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapters" ADD CONSTRAINT "user_chapters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapters" ADD CONSTRAINT "user_chapters_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "manhwa_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_battles" ADD CONSTRAINT "pvp_battles_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

