import { supabase } from "@/lib/supabase";

export interface UserItem {
  id: string;
  user_id: string;
  item_id: string;
  equipped: boolean;
  quantity: number;
  acquired_at: string;
  items?: {
    name: string;
    description: string;
    rarity: string;
    type: string;
    effects: Record<string, number> | null;
    image_url: string | null;
  }
}

/** Fetch user's inventory */
export async function getUserInventory(userId: string): Promise<UserItem[]> {
  if (!userId || userId === "local-user") return [];
  const { data, error } = await supabase
    .from("user_inventory")
    .select(`
      *,
      items (*)
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("[inventoryService] Error fetching inventory:", error);
    return [];
  }

  return data || [];
}

/** Equip or unequip an item */
export async function toggleEquipItem(userId: string, userItemId: string, equip: boolean) {
  if (!userId || userId === "local-user") return null;
  const { data, error } = await supabase
    .from("user_inventory")
    .update({ equipped: equip })
    .eq("id", userItemId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[inventoryService] Error toggling equip:", error);
    return null;
  }
  return data;
}

/** Get all system items */
export async function getSystemItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*");
  
  if (error) {
    console.error("[inventoryService] Error fetching system items:", error);
    return [];
  }
  return data || [];
}

const STARTER_ITEMS = [
  { name: "Hunter's Badge",     item_type: "EQUIPMENT",       rarity: "COMMON",   description: "Proof of awakening. +5 STR",  effects: { strength: 5 },              emoji: "🏅" },
  { name: "Mana Stone (Small)", item_type: "CONSUMABLE",      rarity: "COMMON",   description: "Restores 20 MP on use",       effects: { mp: 20 },                   emoji: "💎" },
  { name: "Health Potion",      item_type: "CONSUMABLE",      rarity: "COMMON",   description: "Restores 50 HP on use",       effects: { hp: 50 },                   emoji: "🧪" },
  { name: "Iron Dagger",        item_type: "EQUIPMENT",       rarity: "UNCOMMON", description: "Starting weapon. +10 STR",    effects: { strength: 10, agility: 5 }, emoji: "🗡️" },
  { name: "Shadow Essence",     item_type: "SHADOW_FRAGMENT", rarity: "RARE",     description: "Crystallized shadow energy.", effects: { shadow_extract: 1 },        emoji: "🌑" },
];

export async function seedStarterItems() {
  try {
    const { data: existing } = await supabase.from("items").select("id").limit(1);
    if (existing && existing.length > 0) return;

    for (const item of STARTER_ITEMS) {
      await supabase.from("items").insert(item);
    }
  } catch (e) {
    console.error("[inventoryService] Seed error:", e);
  }
}

export async function grantStarterItemsToUser(userId: string) {
  if (!userId || userId === "local-user") return;
  try {
    const { data: items } = await supabase.from("items").select("id, name").in("name", STARTER_ITEMS.map(i => i.name));
    if (!items || items.length === 0) return;

    const userItems = items.map(item => ({
      user_id: userId,
      item_id: item.id,
      equipped: item.name === "Hunter's Badge",
      quantity: item.name.includes("Potion") || item.name.includes("Stone") || item.name.includes("Essence") ? 3 : 1
    }));

    const { error } = await supabase.from("user_inventory").insert(userItems);
    if (error) {
      console.error("[inventoryService] Failed granting starter items:", error.message);
    }
  } catch (e) {
    console.error("[inventoryService] grant error:", e);
  }
}
