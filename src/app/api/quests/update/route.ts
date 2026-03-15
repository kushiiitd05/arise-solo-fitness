import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { xpForLevel, rankFromLevelAndXp } from "@/lib/game/xpEngine";

function today() {
  return new Date().toISOString().split("T")[0];
}

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { questId, newCurrent } = body || {};
  if (!questId || newCurrent === undefined || newCurrent === null) {
    return NextResponse.json({ error: "Missing questId or newCurrent" }, { status: 400 });
  }

  const date = today();

  // Fetch today's quest row
  const { data: row, error: fetchErr } = await supabase
    .from("daily_quests")
    .select("*")
    .eq("user_id", userId)
    .eq("quest_date", date)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Daily quest record not found" }, { status: 404 });
  }

  // Capture before mutation — prevents double XP grant
  const wasAllCompleted = row.all_completed;

  // Map quests: update matching quest with newCurrent, compute completed server-side
  const updatedQuests = (row.quests as any[]).map((q: any) =>
    q.id === questId
      ? { ...q, current: newCurrent, completed: newCurrent >= q.target }
      : q
  );

  const allCompleted = updatedQuests.every((q: any) => q.completed);

  await supabase
    .from("daily_quests")
    .update({ quests: updatedQuests, all_completed: allCompleted })
    .eq("user_id", userId)
    .eq("quest_date", date);

  // Level-up state (declared outside if block so they're in scope for the response)
  let leveledUp = false;
  let newLevel = 1;
  let newRank: string = "E";
  let statPointsAwarded = 0;

  // Only grant XP when this update causes the transition false → true
  if (allCompleted && !wasAllCompleted) {
    const xpEarned = (updatedQuests as any[]).reduce(
      (sum: number, q: any) => sum + (q.xp_reward ?? 0),
      0
    );

    const { data: user } = await supabase
      .from("users")
      .select("current_xp, level")
      .eq("id", userId)
      .maybeSingle();

    if (user) {
      let xp = user.current_xp + xpEarned;
      let level = user.level;

      // Level-up loop
      while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level++;
        statPointsAwarded += 3;
        leveledUp = true;
      }

      newLevel = level;
      newRank = rankFromLevelAndXp(level, user.current_xp + xpEarned);

      await supabase
        .from("users")
        .update({ current_xp: xp, level, hunter_rank: newRank })
        .eq("id", userId);

      // Award stat points on level-up
      if (statPointsAwarded > 0) {
        const { data: statRow } = await supabase
          .from("user_stats")
          .select("available_stat_points")
          .eq("user_id", userId)
          .maybeSingle();
        if (statRow) {
          await supabase
            .from("user_stats")
            .update({
              available_stat_points:
                (statRow.available_stat_points || 0) + statPointsAwarded,
            })
            .eq("user_id", userId);
        }
      }

      // Update total XP earned in stats
      const { data: stats } = await supabase
        .from("user_stats")
        .select("total_xp_earned")
        .eq("user_id", userId)
        .maybeSingle();
      if (stats) {
        await supabase
          .from("user_stats")
          .update({ total_xp_earned: (stats.total_xp_earned || 0) + xpEarned })
          .eq("user_id", userId);
      }
    }
  }

  return NextResponse.json({
    success: true,
    questId,
    newCurrent,
    allCompleted,
    quests: updatedQuests,
    leveledUp,
    newLevel,
    newRank,
    statPointsAwarded,
  });
}
