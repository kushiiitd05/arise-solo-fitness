import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { xpForLevel, rankFromLevelAndXp } from "@/lib/game/xpEngine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { userId, amount, reason } = body || {};

  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Missing userId or invalid amount" }, { status: 400 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("level, current_xp, hunter_rank")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let xp        = user.current_xp + amount;
  let level     = user.level;
  let leveledUp = false;
  let statPointsAwarded = 0;

  // Process level-ups
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
    leveledUp = true;
    statPointsAwarded += 3;
  }

  const newRank     = rankFromLevelAndXp(level, (user.current_xp + amount));
  const rankChanged = newRank !== user.hunter_rank;

  // Update user record
  await supabase.from("users").update({
    current_xp:  xp,
    level,
    hunter_rank: newRank,
  }).eq("id", userId);

  // Update stats: total XP + stat points
  if (leveledUp && statPointsAwarded > 0) {
    const { data: stats } = await supabase
      .from("user_stats")
      .select("total_xp_earned, available_stat_points")
      .eq("user_id", userId)
      .maybeSingle();

    if (stats) {
      await supabase.from("user_stats").update({
        total_xp_earned:      (stats.total_xp_earned || 0) + amount,
        available_stat_points: (stats.available_stat_points || 0) + statPointsAwarded,
      }).eq("user_id", userId);
    }
  }

  return NextResponse.json({
    success: true,
    reason,
    amountAwarded:    amount,
    newXp:            xp,
    newLevel:         level,
    newRank,
    leveledUp,
    rankChanged,
    statPointsAwarded,
    xpToNextLevel:    xpForLevel(level),
  });
}
