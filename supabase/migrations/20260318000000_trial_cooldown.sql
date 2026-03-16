-- Phase 7: Add trial cooldown tracking to user_stats
-- trial_last_failed_at: null = no failed trial; timestamp = last failure time for 24h cooldown
ALTER TABLE "user_stats"
  ADD COLUMN IF NOT EXISTS "trial_last_failed_at" TIMESTAMPTZ DEFAULT NULL;
