import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { xpForLevel } from "@/lib/game/xpEngine";

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { amount, reason } = body || {};

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("level, current_xp")
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

  // Update user record — rank column is exclusively written by /api/rank/advance
  await supabase.from("users").update({
    current_xp: xp,
    level,
  }).eq("id", userId);

  // Always update total_xp_earned; only award stat points on level-up
  const { data: stats } = await supabase
    .from("user_stats")
    .select("total_xp_earned, available_stat_points")
    .eq("user_id", userId)
    .maybeSingle();

  if (stats) {
    await supabase.from("user_stats").update({
      total_xp_earned: (stats.total_xp_earned || 0) + amount,
      ...(leveledUp && statPointsAwarded > 0
        ? { available_stat_points: (stats.available_stat_points || 0) + statPointsAwarded }
        : {}),
    }).eq("user_id", userId);
  }

  return NextResponse.json({
    success: true,
    reason,
    amountAwarded:    amount,
    newXp:            xp,
    newLevel:         level,
    leveledUp,
    statPointsAwarded,
    xpToNextLevel:    xpForLevel(level),
  });
}
