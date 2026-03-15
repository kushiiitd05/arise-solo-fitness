import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { shouldTriggerPenalty, xpForLevel, rankFromLevelAndXp } from "@/lib/game/xpEngine";

function today() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { userId, questId } = body || {};
  if (!userId || !questId) {
    return NextResponse.json({ error: "Missing userId or questId" }, { status: 400 });
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

  // Mark the quest complete
  const updatedQuests = (row.quests as any[]).map((q: any) =>
    q.id === questId ? { ...q, current: q.target, completed: true } : q
  );

  const allCompleted = updatedQuests.every((q: any) => q.completed);
  const xpEarned     = (updatedQuests.find((q: any) => q.id === questId)?.xp) ?? 0;

  await supabase
    .from("daily_quests")
    .update({ quests: updatedQuests, all_completed: allCompleted })
    .eq("user_id", userId)
    .eq("quest_date", date);

  // Award XP to user
  const { data: user } = await supabase.from("users").select("current_xp, level").eq("id", userId).maybeSingle();
  if (user) {
    await supabase
      .from("users")
      .update({ current_xp: user.current_xp + xpEarned })
      .eq("id", userId);
  }

  // Update total XP earned in stats
  const { data: stats } = await supabase.from("user_stats").select("total_xp_earned").eq("user_id", userId).maybeSingle();
  if (stats) {
    await supabase
      .from("user_stats")
      .update({ total_xp_earned: (stats.total_xp_earned || 0) + xpEarned })
      .eq("user_id", userId);
  }

  const penaltyRisk = shouldTriggerPenalty(updatedQuests);

  return NextResponse.json({
    success: true,
    questId,
    xpEarned,
    allCompleted,
    penaltyRisk,
    quests: updatedQuests,
  });
}
