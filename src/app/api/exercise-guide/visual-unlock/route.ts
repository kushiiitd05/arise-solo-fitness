import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Copy-don't-import per Phase 3 decision
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7) || null;
}

const MANA_COST = 1;

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { exerciseId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { exerciseId } = body;
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  // Idempotency check: if image already exists for this user/exercise, return it without charging mana
  const { data: existing } = await supabaseServer
    .from("user_exercise_images")
    .select("image_url")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ imageUrl: existing.image_url, alreadyUnlocked: true });
  }

  // Fetch user stats to compute available mana
  const { data: userStats } = await supabaseServer
    .from("user_stats")
    .select("intelligence, level, mana_spent")
    .eq("user_id", userId)
    .maybeSingle();

  if (!userStats) {
    return NextResponse.json({ error: "User stats not found" }, { status: 404 });
  }

  const availableMana = (userStats.intelligence * userStats.level) - (userStats.mana_spent ?? 0);
  if (availableMana < MANA_COST) {
    return NextResponse.json({ error: "Insufficient mana", available: availableMana }, { status: 402 });
  }

  // Deduct mana
  await supabaseServer
    .from("user_stats")
    .update({ mana_spent: (userStats.mana_spent ?? 0) + MANA_COST })
    .eq("user_id", userId);

  // Construct Pollinations.ai URL (URL is the image — no additional fetch needed)
  const prompt = `${exerciseId.replace(/_/g, " ")} fitness exercise demonstration proper form`;
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

  // Persist to user_exercise_images
  await supabaseServer.from("user_exercise_images").insert({
    user_id: userId,
    exercise_id: exerciseId,
    image_url: imageUrl,
  });

  const manaRemaining = availableMana - MANA_COST;
  return NextResponse.json({ imageUrl, manaRemaining });
}
