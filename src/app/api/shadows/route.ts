import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";

// Reads Authorization: Bearer <userId> header only — never URL params or body.
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// GET /api/shadows
// Returns the authenticated user's shadow army joined to the shadows table.
// Used by ShadowArmy.tsx — expects shadow.shadows.name, shadow.shadows.grade, shadow.shadows.type.
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_shadows")
    .select("*, shadows(*)")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to fetch shadows" }, { status: 500 });

  return NextResponse.json({ shadows: data || [] });
}
