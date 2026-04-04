import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { RANK_THRESHOLDS } from "@/lib/game/xpEngine";

const RANK_COLORS: Record<string, string> = {
  E: "#9ca3af", D: "#22c55e", C: "#3b82f6",
  B: "#a855f7", A: "#f59e0b", S: "#ef4444", NATIONAL: "#f97316",
};

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

  const { data, error } = await supabase
    .from("users")
    .select("id, username, avatar_url, level, current_xp, hunter_rank, job_class, title")
    .order("level", { ascending: false })
    .order("current_xp", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ranked = (data || []).map((user, i) => ({
    position:  i + 1,
    id:        user.id,
    username:  user.username,
    avatarUrl: user.avatar_url,
    level:     user.level,
    rank:      user.hunter_rank,
    rankColor: RANK_COLORS[user.hunter_rank] || "#9ca3af",
    jobClass:  user.job_class,
    title:     user.title,
  }));

  return NextResponse.json({ leaderboard: ranked, total: ranked.length });
}
