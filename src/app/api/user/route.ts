import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";

function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [userRes, statsRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (userRes.error) return NextResponse.json({ error: userRes.error.message }, { status: 500 });
  if (!userRes.data) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user: userRes.data, stats: statsRes.data ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const { data, error } = await supabase.from("users").upsert({
    id:         body.id,
    username:   body.username   || "Shadow Hunter",
    email:      body.email      || "",
    avatar_url: body.avatar     || null,
    job_class:  body.jobClass   || "NONE",
    hunter_rank:"E",
    level:      1,
    current_xp: 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Seed default stats row
  await supabase.from("user_stats").upsert({
    user_id: body.id,
    strength: 10, vitality: 10, agility: 10,
    intelligence: 10, perception: 10, sense: 10,
    available_stat_points: 0,
    total_workouts: 0, current_streak: 0,
    longest_streak: 0, total_calories_burned: 0,
    total_xp_earned: 0, pvp_rating: 1000, pvp_wins: 0, pvp_losses: 0,
  });

  return NextResponse.json({ user: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { data, error } = await supabase.from("users").update(body).eq("id", userId).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ user: data });
}
