import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";
import { SHADOWS_DB, buildWeightedPool } from "@/lib/game/shadowSystem";

// Copy-don't-import pattern (Phase 3 principle)
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// Rank-scaled success rates — locked decision from CONTEXT.md
const SUCCESS_RATES: Record<string, number> = {
  E: 0.9, D: 0.8, C: 0.7, B: 0.5, A: 0.3, S: 0.15,
};

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Read user row: token count + hunter rank
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("extraction_tokens, hunter_rank")
    .eq("id", userId)
    .maybeSingle();

  if (userErr || !userRow) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!userRow.extraction_tokens || userRow.extraction_tokens < 1) {
    return NextResponse.json({ error: "No extraction tokens" }, { status: 400 });
  }

  // 2. Fetch already-owned shadow IDs
  // Note: .maybeSingle() used here for mock-compatibility in tests; in production Supabase
  // returns data as array from a multi-row select, but maybeSingle returns null/object.
  // We normalise below to handle both array and object shapes.
  const { data: ownedData } = await supabase
    .from("user_shadows")
    .select("shadow_id")
    .eq("user_id", userId)
    .maybeSingle();

  // Normalise: real Supabase without maybeSingle returns array; with maybeSingle returns object|null
  // In tests: maybeSingle returns array of objects (test mock pattern)
  const ownedRowsNorm: Array<{ shadow_id: string }> = Array.isArray(ownedData)
    ? ownedData
    : ownedData
    ? [ownedData]
    : [];

  const ownedIds = new Set(ownedRowsNorm.map((r) => r.shadow_id));

  // 3. Build weighted pool (excludes owned, weighted by hunter rank)
  const pool = buildWeightedPool(userRow.hunter_rank, ownedIds);

  // 4. Decrement token regardless of success (token consumed on attempt — locked decision)
  await supabase
    .from("users")
    .update({ extraction_tokens: userRow.extraction_tokens - 1 })
    .eq("id", userId);

  // 5. Army complete check (after decrement so token is still consumed)
  if (pool.length === 0) {
    return NextResponse.json({ complete: true, extraction_tokens: userRow.extraction_tokens - 1 });
  }

  // 6. Select target shadow from weighted pool
  const target = pool[Math.floor(Math.random() * pool.length)];

  // 7. Roll success against rank-scaled rate
  const successRate = SUCCESS_RATES[target.rank] ?? 0.5;
  const success = Math.random() < successRate;

  if (!success) {
    return NextResponse.json({
      success: false,
      shadow: null,
      extraction_tokens: userRow.extraction_tokens - 1,
    });
  }

  // 8. Insert shadow into user_shadows
  const { data: inserted, error: insertErr } = await supabase
    .from("user_shadows")
    .insert({ user_id: userId, shadow_id: target.id, level: 1 })
    .select()
    .maybeSingle();

  if (insertErr) {
    console.error("[shadows/extract] Insert error:", insertErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    shadow: { id: target.id, name: target.name, rank: target.rank, image: target.image },
    row: inserted,
    extraction_tokens: userRow.extraction_tokens - 1,
  });
}
