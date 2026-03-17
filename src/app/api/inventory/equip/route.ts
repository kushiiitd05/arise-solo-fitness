import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";

// Copy-don't-import pattern (Phase 3 principle) — self-contained, no shared helper coupling
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
  const { userItemId, equip } = body || {};
  if (!userItemId || typeof equip !== "boolean") {
    return NextResponse.json({ error: "Missing userItemId or equip" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_inventory")
    .update({ equipped: equip })
    .eq("id", userItemId)
    .eq("user_id", userId)   // ownership check — prevents equipping other users' items
    .select("*, items(*)")
    .maybeSingle();

  if (error) {
    console.error("[inventory/equip] DB error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, item: data });
}
