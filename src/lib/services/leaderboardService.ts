import { supabase } from "@/lib/supabase";

export interface LeaderboardEntry {
  id: string;
  username: string;
  level: number;
  hunter_rank: string;
  job_class: string;
  total_xp_earned: number;
  avatar_url: string | null;
}

/** Fetch top hunters ranked by total XP (power) */
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      username,
      level,
      hunter_rank,
      job_class,
      avatar_url,
      user_stats (
        total_xp_earned
      )
    `)
    .order("level", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[leaderboardService] Error fetching rankings:", error);
    return [];
  }

  return data.map((u: any) => ({
    id: u.id,
    username: u.username,
    level: u.level,
    hunter_rank: u.hunter_rank,
    job_class: u.job_class,
    total_xp_earned: u.user_stats?.total_xp_earned || 0,
    avatar_url: u.avatar_url
  }));
}

/** Subscribe to live leaderboard changes */
export function subscribeToLeaderboardChanges(callback: () => void) {
  return supabase
    .channel('leaderboard-changes')
    .on(
      "postgres_changes" as any, { event: '*', table: 'users' }, callback)
    .on(
      "postgres_changes" as any, { event: '*', table: 'user_stats' }, callback)
    .subscribe();
}
