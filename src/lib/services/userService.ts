import { supabase } from "@/lib/supabase";
import { generateDailyQuestsForUser } from "@/lib/services/questService";
import { seedStarterItems, grantStarterItemsToUser } from "@/lib/services/inventoryService";

export interface CreateUserParams {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  jobClass: string;
}

/** Register a new hunter. */
export async function createUser(params: CreateUserParams) {
  if (!params.id || params.id === "local-user") {
    console.error("[createUser] Invalid ID provided");
    return { success: false };
  }

  // 1. Check if user already exists (read is fine with anon key)
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", params.id)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log("[createUser] Hunter already exists in System registry.");
    return { success: true };
  }

  // 2. Create user via server route (uses service role key, bypasses RLS)
  try {
    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: params.id,
        username: params.username,
        email: params.email,
        avatar: params.avatar,
        jobClass: params.jobClass,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[createUser] Server route error:", err);
      return { success: false };
    }
  } catch (err) {
    console.error("[createUser] fetch error:", err);
    return { success: false };
  }

  // 3. Grant starter items (idempotent)
  try {
    await seedStarterItems();
    await grantStarterItemsToUser(params.id);
  } catch (err) {
    console.error("[createUser] Failed to grant starter items:", err);
    // Non-fatal — user creation succeeded
  }

  // 4. Generate initial daily quests
  await generateDailyQuestsForUser(params.id);

  return { success: true };
}

/** Load user profile */
export async function loadUser(userId: string) {
  if (!userId || userId === "local-user") return { user: null, stats: null };

  const [userResult, statsResult] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).limit(1),
    supabase.from("user_stats").select("*").eq("user_id", userId).limit(1),
  ]);

  const user = userResult.data && userResult.data.length > 0 ? userResult.data[0] : null;
  const stats = statsResult.data && statsResult.data.length > 0 ? statsResult.data[0] : null;

  return { user, stats };
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (!username) return true;
  const { data } = await supabase
    .from("users")
    .select("id")
    .ilike("username", username)
    .limit(1);
  return !(data && data.length > 0);
}
