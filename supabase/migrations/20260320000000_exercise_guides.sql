-- Phase 15: Exercise Guidance System
-- Table 1: Shared text guide cache (globally shared across all users)
CREATE TABLE IF NOT EXISTS "exercise_guides" (
    "exercise_id" TEXT NOT NULL,
    "guide_json"  JSONB NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exercise_guides_pkey" PRIMARY KEY ("exercise_id")
);

ALTER TABLE public.exercise_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exercise guides"
  ON public.exercise_guides FOR SELECT
  USING (auth.role() = 'authenticated');

-- Table 2: Per-user visual unlock records
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

CREATE POLICY "Users can read their own exercise images"
  ON public.user_exercise_images FOR SELECT
  USING (auth.uid() = user_id);

-- user_stats: add mana_spent column for server-side mana deduction tracking
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "mana_spent" INTEGER NOT NULL DEFAULT 0;
