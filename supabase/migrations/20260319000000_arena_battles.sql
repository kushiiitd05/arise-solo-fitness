-- Phase 11: Battle System Backend
-- Creates arena_battles table for persistent PvP battle history

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

ALTER TABLE "arena_battles"
  ADD CONSTRAINT "arena_battles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
