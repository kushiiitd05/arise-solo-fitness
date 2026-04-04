import { supabase } from "@/lib/supabase";

export interface UserShadow {
  id: string;
  user_id: string;
  shadow_id: string;
  level: number;
  acquired_at: string;
  shadows?: {
    name: string;
    rarity: string;
    job_class: string;
    base_power: number;
    icon_url: string | null;
  }
}

/** Fetch user's shadow collection */
export async function getUserShadows(userId: string): Promise<UserShadow[]> {
  if (!userId || userId === "local-user") return [];
  const { data, error } = await supabase
    .from("user_shadows")
    .select(`
      *,
      shadows (*)
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("[shadowService] Error fetching shadows:", error);
    return [];
  }
  return data || [];
}

/** Save a newly extracted shadow */
export async function saveExtractedShadow(userId: string, shadowId: string, level = 1) {
  if (!userId || userId === "local-user") return null;
  const { data, error } = await supabase
    .from("user_shadows")
    .insert({
      user_id: userId,
      shadow_id: shadowId,
      level
    })
    .select()
    .limit(1);

  if (error) {
    console.error("[shadowService] Error saving shadow:", error);
    return null;
  }
  return data && data.length > 0 ? data[0] : null;
}

/** Get all available shadows */
export async function getAvailableShadows() {
  const { data, error } = await supabase
    .from("shadows")
    .select("*");
  
  if (error) {
    console.error("[shadowService] Error fetching system shadows:", error);
    return [];
  }
  return data || [];
}
