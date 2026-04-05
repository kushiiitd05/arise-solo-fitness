-- ================================================================
-- ARISE: PENDING MIGRATIONS — paste entire file in Supabase SQL Editor
-- Project: jvhvubojfmofndqzffdd
-- Run once — all statements are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ================================================================

-- ── 1. Add missing columns to users ─────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "extraction_tokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "chapters_unlocked" INTEGER NOT NULL DEFAULT 1;

-- ── 2. Add trial_cooldown column to user_stats ─────────────────
ALTER TABLE "user_stats"
  ADD COLUMN IF NOT EXISTS "trial_last_failed_at" TIMESTAMPTZ DEFAULT NULL;

-- ── 3. Arena battles table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "arena_battles" (
  "id"             UUID    NOT NULL DEFAULT uuid_generate_v4(),
  "user_id"        UUID    NOT NULL,
  "opponent_name"  TEXT    NOT NULL,
  "opponent_rank"  TEXT    NOT NULL,
  "exercise"       TEXT    NOT NULL,
  "outcome"        TEXT    NOT NULL CHECK ("outcome" IN ('WIN', 'LOSS', 'DRAW')),
  "xp_change"      INTEGER NOT NULL DEFAULT 0,
  "rating_change"  INTEGER NOT NULL DEFAULT 0,
  "reps_submitted" INTEGER,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "arena_battles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "arena_battles_user_id_idx" ON "arena_battles"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'arena_battles_user_id_fkey'
  ) THEN
    ALTER TABLE public.arena_battles
      ADD CONSTRAINT arena_battles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.arena_battles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'arena_battles'
      AND policyname = 'Users can read their own battle history'
  ) THEN
    CREATE POLICY "Users can read their own battle history"
      ON public.arena_battles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 4. Exercise guides table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "exercise_guides" (
    "exercise_id" TEXT NOT NULL,
    "guide_json"  JSONB NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exercise_guides_pkey" PRIMARY KEY ("exercise_id")
);

ALTER TABLE public.exercise_guides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exercise_guides'
      AND policyname = 'Authenticated users can read exercise guides'
  ) THEN
    CREATE POLICY "Authenticated users can read exercise guides"
      ON public.exercise_guides
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ── 5. User exercise images table ──────────────────────────────
CREATE TABLE IF NOT EXISTS "user_exercise_images" (
    "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id"     UUID NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "image_url"   TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_exercise_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_exercise_images_unique" UNIQUE ("user_id", "exercise_id")
);

ALTER TABLE public.user_exercise_images ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_exercise_images'
      AND policyname = 'Users can read their own exercise images'
  ) THEN
    CREATE POLICY "Users can read their own exercise images"
      ON public.user_exercise_images
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 6. Add mana_spent to user_stats ────────────────────────────
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "mana_spent" INTEGER NOT NULL DEFAULT 0;

-- ── 7. Seed shadow rows ─────────────────────────────────────────
INSERT INTO "shadows" ("id", "name", "rank", "shadow_type", "base_power", "ability", "rarity", "emoji", "is_active")
VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 'Igris',          'S'::"HunterRank", 'COMMANDER'::"ShadowType", 1500, '{"name": "Commander Presence"}', 'LEGENDARY'::"ItemRarity", '⚔️',  true),
  ('a1b2c3d4-0002-0000-0000-000000000002', 'Beru',           'S'::"HunterRank", 'COMMANDER'::"ShadowType", 1500, '{"name": "Ant Swarm"}',           'LEGENDARY'::"ItemRarity", '🐜',  true),
  ('a1b2c3d4-0003-0000-0000-000000000003', 'Tank',           'S'::"HunterRank", 'COMMANDER'::"ShadowType", 1500, '{"name": "Iron Body"}',           'LEGENDARY'::"ItemRarity", '🛡️', true),
  ('a1b2c3d4-0004-0000-0000-000000000004', 'Tusk',           'A'::"HunterRank", 'ELITE'::"ShadowType",      800, '{"name": "Orc Berserker"}',       'EPIC'::"ItemRarity",      '🦷',  true),
  ('a1b2c3d4-0005-0000-0000-000000000005', 'Iron',           'B'::"HunterRank", 'KNIGHT'::"ShadowType",     400, '{"name": "High Defense"}',        'RARE'::"ItemRarity",      '⚙️',  true),
  ('a1b2c3d4-0006-0000-0000-000000000006', 'Greed',          'B'::"HunterRank", 'KNIGHT'::"ShadowType",     400, '{"name": "Arcane Drain"}',        'RARE'::"ItemRarity",      '💀',  true),
  ('a1b2c3d4-0007-0000-0000-000000000007', 'Kaisel',         'A'::"HunterRank", 'ELITE'::"ShadowType",      800, '{"name": "Dragon Charge"}',       'EPIC'::"ItemRarity",      '🐉',  true),
  ('a1b2c3d4-0008-0000-0000-000000000008', 'Bellion',        'S'::"HunterRank", 'MONARCH'::"ShadowType",   1500, '{"name": "Grand Marshal"}',       'LEGENDARY'::"ItemRarity", '👁️', true),
  ('a1b2c3d4-0009-0000-0000-000000000009', 'High Orc',       'C'::"HunterRank", 'SOLDIER'::"ShadowType",    200, '{"name": "Warchief Strike"}',     'UNCOMMON'::"ItemRarity",  '🪓',  true),
  ('a1b2c3d4-0010-0000-0000-000000000010', 'Fangs',          'D'::"HunterRank", 'SOLDIER'::"ShadowType",    100, '{"name": "Wolf Instinct"}',       'COMMON'::"ItemRarity",    '🐺',  true),
  ('a1b2c3d4-0011-0000-0000-000000000011', 'Hobgoblin',      'D'::"HunterRank", 'SOLDIER'::"ShadowType",    100, '{"name": "Mob Surge"}',           'COMMON'::"ItemRarity",    '👺',  true),
  ('a1b2c3d4-0012-0000-0000-000000000012', 'Knight Captain', 'B'::"HunterRank", 'KNIGHT'::"ShadowType",     400, '{"name": "Vanguard Rush"}',       'RARE'::"ItemRarity",      '🗡️', true),
  ('a1b2c3d4-0013-0000-0000-000000000013', 'Shadow Mage',    'B'::"HunterRank", 'KNIGHT'::"ShadowType",     400, '{"name": "Arcane Barrage"}',      'RARE'::"ItemRarity",      '🔮',  true),
  ('a1b2c3d4-0014-0000-0000-000000000014', 'Cerberus',       'A'::"HunterRank", 'ELITE'::"ShadowType",      800, '{"name": "Triad Guard"}',         'EPIC'::"ItemRarity",      '🐾',  true),
  ('a1b2c3d4-0015-0000-0000-000000000015', 'Architect',      'S'::"HunterRank", 'MONARCH'::"ShadowType",   1500, '{"name": "System Override"}',     'LEGENDARY'::"ItemRarity", '🏛️', true),
  ('a1b2c3d4-0016-0000-0000-000000000016', 'Shadow Soldier', 'E'::"HunterRank", 'SOLDIER'::"ShadowType",     50, '{"name": "Basic Combat"}',        'COMMON'::"ItemRarity",    '👤',  true),
  ('a1b2c3d4-0017-0000-0000-000000000017', 'Shadow Knight',  'C'::"HunterRank", 'SOLDIER'::"ShadowType",    200, '{"name": "Knight Guard"}',        'UNCOMMON'::"ItemRarity",  '🛡️', true)
ON CONFLICT ("id") DO NOTHING;

-- ── 8. Auth trigger ─────────────────────────────────────────────
-- NOTE: live schema uses "total_workouts" (not "total_workouts_completed")
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email, avatar_url, hunter_rank, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    'E',
    1
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_stats (
    user_id,
    strength, vitality, agility, intelligence, perception, sense,
    available_stat_points, total_workouts, current_streak, pvp_rating
  )
  VALUES (NEW.id, 10, 10, 10, 10, 10, 10, 0, 0, 0, 1000)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 9. Seed user_stats for existing users (backfill) ───────────
INSERT INTO public.user_stats (
  user_id,
  strength, vitality, agility, intelligence, perception, sense,
  available_stat_points, total_workouts, current_streak,
  longest_streak, total_calories_burned, total_xp_earned,
  pvp_rating, pvp_wins, pvp_losses
)
SELECT
  u.id,
  10, 10, 10, 10, 10, 10,
  0, 0, 0, 0, 0, 0,
  1000, 0, 0
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_stats s WHERE s.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ── 10. Performance indexes ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS arena_battles_user_id_created_idx ON arena_battles(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS exercise_guides_exercise_id_idx ON exercise_guides(exercise_id);

-- ================================================================
-- Done. Verify by running:
--   SELECT COUNT(*) FROM user_stats;
--   SELECT COUNT(*) FROM arena_battles;
--   SELECT COUNT(*) FROM exercise_guides;
-- ================================================================
