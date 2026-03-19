import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";

// Copy-don't-import pattern (Phase 3 principle) — self-contained
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

  // Read current token count and chapters_unlocked (Supabase v2 has no raw() — must read-then-write)
  const { data: userRow, error: readErr } = await supabase
    .from("users")
    .select("extraction_tokens, chapters_unlocked")
    .eq("id", userId)
    .maybeSingle();

  if (readErr || !userRow) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentTokens = userRow.extraction_tokens ?? 0;
  const currentChapters = userRow.chapters_unlocked ?? 1;
  const newChapters = Math.min(currentChapters + 1, 4);
  const chapterUnlocked = newChapters > currentChapters;

  const { error: updateErr } = await supabase
    .from("users")
    .update({
      extraction_tokens: currentTokens + 1,
      chapters_unlocked: newChapters,
    })
    .eq("id", userId);

  if (updateErr) {
    console.error("[boss/complete] Token grant error:", updateErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    extraction_tokens: currentTokens + 1,
    chapters_unlocked: newChapters,
    chapter_newly_unlocked: chapterUnlocked,
  });
}
