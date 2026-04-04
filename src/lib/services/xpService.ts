import { supabase } from "@/lib/supabase";
import { xpForLevel, rankAtLevel, titleForRank } from "@/lib/gameReducer";

export interface LevelUpResult {
  levelsGained: number;
  newLevel: number;
  prevLevel: number;
  newRank: string;
  prevRank: string;
  rankPromoted: boolean;
  statPointsAwarded: number;
  newXp: number;
}

/** Award XP to a user in Supabase */
export async function awardXp(userId: string, xpAmount: number): Promise<LevelUpResult | null> {
  if (!userId || userId === "local-user") return null;
  
  const { data: rows, error } = await supabase
    .from("users")
    .select("level, current_xp, hunter_rank")
    .eq("id", userId)
    .limit(1);

  const user = rows && rows.length > 0 ? rows[0] : null;
  if (error || !user) return null;

  let xp = (user.current_xp || 0) + xpAmount;
  let level = user.level || 1;
  const prevLevel = level;
  const prevRank = user.hunter_rank || "E";
  let statPointsToAward = 0;

  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
    statPointsToAward += 3;
  }

  const newRank = rankAtLevel(level);
  const rankPromoted = newRank !== prevRank;

  const { error: updateError } = await supabase.from("users").update({
    current_xp: xp,
    level,
    hunter_rank: newRank,
    title: titleForRank(newRank),
  }).eq("id", userId);

  if (updateError) return null;

  if (statPointsToAward > 0) {
    const { data: statRow } = await supabase
      .from("user_stats")
      .select("available_stat_points")
      .eq("user_id", userId)
      .maybeSingle();
    if (statRow !== null) {
      await supabase.from("user_stats").update({
        available_stat_points: (statRow.available_stat_points ?? 0) + statPointsToAward,
      }).eq("user_id", userId);
    }
  }

  const { data: xpRow } = await supabase
    .from("user_stats")
    .select("total_xp_earned")
    .eq("user_id", userId)
    .maybeSingle();
  if (xpRow !== null) {
    await supabase.from("user_stats").update({
      total_xp_earned: (xpRow.total_xp_earned ?? 0) + xpAmount,
    }).eq("user_id", userId);
  }

  return { levelsGained: level - prevLevel, newLevel: level, prevLevel, newRank, prevRank, rankPromoted, statPointsAwarded: statPointsToAward, newXp: xp };
}

/** Log a completed workout to the DB */
export async function logWorkout(params: {
  userId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  durationSeconds: number;
  xpEarned: number;
  arVerified: boolean;
}) {
  if (!params.userId || params.userId === "local-user") return false;
  const { error } = await supabase.from("workout_logs").insert({
    user_id: params.userId,
    exercise_name: params.exerciseName,
    sets: params.sets,
    reps: params.reps,
    duration_seconds: params.durationSeconds,
    xp_earned: params.xpEarned,
    ar_verified: params.arVerified,
    started_at: new Date(Date.now() - params.durationSeconds * 1000).toISOString(),
    completed_at: new Date().toISOString(),
    status: "COMPLETED",
  });
  if (error) console.error("[xpService] logWorkout error:", error);
  return !error;
}
