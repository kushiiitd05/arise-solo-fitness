import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { generateDynamicDailyQuests } from "@/lib/game/questEngine";

function today() {
  return new Date().toISOString().split("T")[0];
}

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = today();

  const { data, error } = await supabase
    .from("daily_quests")
    .select("*")
    .eq("user_id", userId)
    .eq("quest_date", date)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ quests: [], generated: false });
  }

  return NextResponse.json({ quests: data.quests, allCompleted: data.all_completed });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);

  const date = today();

  // Check if already generated today
  const existing = await supabase
    .from("daily_quests")
    .select("id")
    .eq("user_id", userId)
    .eq("quest_date", date)
    .maybeSingle();

  if (existing.data) {
    return NextResponse.json({ message: "Quests already generated", date });
  }

  // Fetch user level and job class
  const userRes = await supabase
    .from("users")
    .select("level, job_class")
    .eq("id", userId)
    .maybeSingle();

  if (userRes.error) return NextResponse.json({ error: userRes.error.message }, { status: 500 });

  const level    = userRes.data?.level    ?? 1;
  const jobClass = userRes.data?.job_class ?? "NONE";

  // 3-day history for difficulty adaptation
  const threeDaysAgo = [1, 2, 3].map((n) => {
    const d = new Date(date);
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  });

  const historyRes = await supabase
    .from("daily_quests")
    .select("all_completed")
    .eq("user_id", userId)
    .in("quest_date", threeDaysAgo);

  const historyRows = historyRes.data ?? [];

  // Yesterday's quest types for anti-repeat
  const yesterdayRes = await supabase
    .from("daily_quests")
    .select("quests")
    .eq("user_id", userId)
    .eq("quest_date", threeDaysAgo[0])
    .maybeSingle();

  const previousTypes: string[] = Array.isArray(yesterdayRes.data?.quests)
    ? (yesterdayRes.data.quests as Array<{ type: string }>).map((q) => q.type)
    : [];

  // Generate dynamic quests
  const quests = generateDynamicDailyQuests(level, jobClass, date, historyRows, previousTypes);

  const { data, error } = await supabase.from("daily_quests").insert({
    user_id:          userId,
    quest_date:       date,
    quests,
    all_completed:    false,
    penalty_triggered: false,
  }).select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ quests: data.quests, generated: true });
}
