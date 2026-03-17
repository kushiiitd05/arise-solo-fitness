import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase-server";

// Reads Authorization: Bearer <userId> header only — never URL params or body.
function getUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// GET /api/inventory
// Returns the authenticated user's inventory split into equipped and unequipped items,
// with each row joined to the items table via the items(*) relation.
// Used by Inventory.tsx — expects item.items.name, item.items.rarity, item.items.effects.
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_inventory")
    .select("*, items(*)")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });

  const equipped   = (data || []).filter((item: any) =>  item.equipped);
  const unequipped = (data || []).filter((item: any) => !item.equipped);

  return NextResponse.json({ equipped, unequipped });
}
