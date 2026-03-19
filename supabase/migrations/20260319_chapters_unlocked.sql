-- Phase 12: Manhwa Chapter Reward System
-- Add chapters_unlocked counter to users table.
-- DEFAULT 1 ensures all existing users have Chapter 1 accessible (matching initialState.chapters[0].unlocked = true).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "chapters_unlocked" INTEGER NOT NULL DEFAULT 1;
