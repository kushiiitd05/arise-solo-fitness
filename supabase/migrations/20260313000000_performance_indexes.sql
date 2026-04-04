-- Optimized Performance Indexes for ARISE Solo Leveling System

-- 1. Faster workout history lookups
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, started_at DESC);

-- 2. Daily quest lookup optimization
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date DESC);

-- 3. Leaderboard query optimization (Board Type + Score ranking)
CREATE INDEX IF NOT EXISTS idx_leaderboards_board_type_score ON leaderboards(board_type, score DESC);

-- 4. Guild member lookups
CREATE INDEX IF NOT EXISTS idx_guild_members_guild_id ON guild_members(guild_id);

-- 5. Notification delivery and read-status filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC);

-- 6. User Inventory & Shadows access
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shadows_user_id ON user_shadows(user_id);

-- 7. Chapter unlock tracking
CREATE INDEX IF NOT EXISTS idx_user_chapters_user_id ON user_chapters(user_id, unlocked_at DESC);

-- 8. Battle history for Arena
CREATE INDEX IF NOT EXISTS idx_pvp_battles_users ON pvp_battles(challenger_id, opponent_id, status);

COMMENT ON INDEX idx_workout_logs_user_date IS 'Speeds up dashboard workout history and stat calculation';
COMMENT ON INDEX idx_leaderboards_board_type_score IS 'Ensures S-Rank performance for global rankings';
