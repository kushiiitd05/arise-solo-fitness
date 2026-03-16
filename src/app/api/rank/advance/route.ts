import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { nextRankInfo } from "@/lib/game/xpEngine";
import type { HunterRank } from "@/lib/game/xpEngine";

// Local copy — do not import from shared helper (Phase 3 decision)
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

const RANK_ADVANCE_XP: Partial<Record<string, number>> = {
  E: 1_000,
  D: 2_000,
  C: 5_000,
  B: 10_000,
  A: 25_000,
  S: 50_000,
};

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { trialPassed } = body;

  // 1. Fetch user from DB
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("level, current_xp, hunter_rank")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 2. If trial was failed — record the cooldown timestamp and return
  if (trialPassed === false) {
    await supabase
      .from("user_stats")
      .update({ trial_last_failed_at: new Date().toISOString() })
      .eq("user_id", userId);
    return NextResponse.json({ success: true, failureRecorded: true });
  }

  // 3. Fetch user_stats for total XP (needed for dual-gate check)
  const { data: stats } = await supabase
    .from("user_stats")
    .select("total_xp_earned, available_stat_points")
    .eq("user_id", userId)
    .maybeSingle();

  const totalXp = stats?.total_xp_earned ?? 0;

  // 4. Re-derive next rank info server-side — never trust client rank state
  const nextInfo = nextRankInfo(user.hunter_rank as HunterRank);
  if (!nextInfo.nextRank) {
    return NextResponse.json({ error: "Already at maximum rank" }, { status: 400 });
  }

  // 5. Dual-gate validation — server-side
  const eligible =
    user.level >= nextInfo.levelThreshold &&
    totalXp >= nextInfo.xpThreshold;
  if (!eligible) {
    return NextResponse.json(
      {
        error: "Gate conditions not met",
        required: { level: nextInfo.levelThreshold, xp: nextInfo.xpThreshold },
        current: { level: user.level, xp: totalXp },
      },
      { status: 403 }
    );
  }

  // 6. Idempotency guard — if already advanced, return success without re-awarding
  if (user.hunter_rank === nextInfo.nextRank) {
    return NextResponse.json({
      success: true,
      alreadyAdvanced: true,
      newRank: nextInfo.nextRank,
    });
  }

  // 7. Write new rank to users table
  const { error: rankUpdateError } = await supabase
    .from("users")
    .update({ hunter_rank: nextInfo.nextRank })
    .eq("id", userId);

  if (rankUpdateError) {
    return NextResponse.json({ error: "Failed to update rank" }, { status: 500 });
  }

  // 8. Award +5 stat points to user_stats
  const currentPoints = stats?.available_stat_points ?? 0;
  await supabase
    .from("user_stats")
    .update({ available_stat_points: currentPoints + 5 })
    .eq("user_id", userId);

  // 9. Award XP bonus via /api/xp/award (absolute URL required from server route)
  const xpBonus = RANK_ADVANCE_XP[user.hunter_rank] ?? 1_000;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    await fetch(`${baseUrl}/api/xp/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        amount: xpBonus,
        reason: `rank_advance_${user.hunter_rank}_to_${nextInfo.nextRank}`,
      }),
    });
  } catch {
    // XP award failure is non-fatal — rank already advanced
    console.error("[rank/advance] XP award fetch failed, rank still advanced");
  }

  return NextResponse.json({
    success: true,
    newRank: nextInfo.nextRank,
    xpBonus,
    statPoints: 5,
  });
}
