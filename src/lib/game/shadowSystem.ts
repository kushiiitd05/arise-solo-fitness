import { GameState } from "@/lib/gameReducer";

export interface Shadow {
  id: string;
  name: string;
  rank: string;
  ability: string;
  buff: { stat: keyof GameState["stats"]; multiplier: number };
  image: string;
}

export const SHADOWS_DB: Shadow[] = [
  { id: "a1b2c3d4-0001-0000-0000-000000000001", name: "Igris",          rank: "S", ability: "Commander Presence", buff: { stat: "strength",     multiplier: 1.10 }, image: "⚔️" },
  { id: "a1b2c3d4-0002-0000-0000-000000000002", name: "Beru",           rank: "S", ability: "Ant Swarm",          buff: { stat: "agility",      multiplier: 1.12 }, image: "🐜" },
  { id: "a1b2c3d4-0003-0000-0000-000000000003", name: "Tank",           rank: "S", ability: "Iron Body",          buff: { stat: "vitality",     multiplier: 1.08 }, image: "🛡️" },
  { id: "a1b2c3d4-0004-0000-0000-000000000004", name: "Tusk",           rank: "A", ability: "Orc Berserker",      buff: { stat: "strength",     multiplier: 1.06 }, image: "🦷" },
  { id: "a1b2c3d4-0005-0000-0000-000000000005", name: "Iron",           rank: "B", ability: "High Defense",       buff: { stat: "vitality",     multiplier: 1.05 }, image: "⚙️" },
  { id: "a1b2c3d4-0006-0000-0000-000000000006", name: "Greed",          rank: "B", ability: "Arcane Drain",       buff: { stat: "intelligence", multiplier: 1.07 }, image: "💀" },
  { id: "a1b2c3d4-0007-0000-0000-000000000007", name: "Kaisel",         rank: "A", ability: "Dragon Charge",      buff: { stat: "agility",      multiplier: 1.09 }, image: "🐉" },
  { id: "a1b2c3d4-0008-0000-0000-000000000008", name: "Bellion",        rank: "S", ability: "Grand Marshal",      buff: { stat: "intelligence", multiplier: 1.11 }, image: "👁️" },
  { id: "a1b2c3d4-0009-0000-0000-000000000009", name: "High Orc",       rank: "C", ability: "Warchief Strike",    buff: { stat: "strength",     multiplier: 1.03 }, image: "🪓" },
  { id: "a1b2c3d4-0010-0000-0000-000000000010", name: "Fangs",          rank: "D", ability: "Wolf Instinct",      buff: { stat: "agility",      multiplier: 1.02 }, image: "🐺" },
  { id: "a1b2c3d4-0011-0000-0000-000000000011", name: "Hobgoblin",      rank: "D", ability: "Mob Surge",          buff: { stat: "strength",     multiplier: 1.02 }, image: "👺" },
  { id: "a1b2c3d4-0012-0000-0000-000000000012", name: "Knight Captain", rank: "B", ability: "Vanguard Rush",      buff: { stat: "agility",      multiplier: 1.06 }, image: "🗡️" },
  { id: "a1b2c3d4-0013-0000-0000-000000000013", name: "Shadow Mage",    rank: "B", ability: "Arcane Barrage",     buff: { stat: "intelligence", multiplier: 1.08 }, image: "🔮" },
  { id: "a1b2c3d4-0014-0000-0000-000000000014", name: "Cerberus",       rank: "A", ability: "Triad Guard",        buff: { stat: "vitality",     multiplier: 1.07 }, image: "🐾" },
  { id: "a1b2c3d4-0015-0000-0000-000000000015", name: "Architect",      rank: "S", ability: "System Override",    buff: { stat: "intelligence", multiplier: 1.15 }, image: "🏛️" },
  { id: "a1b2c3d4-0016-0000-0000-000000000016", name: "Shadow Soldier", rank: "E", ability: "Basic Combat",       buff: { stat: "strength",     multiplier: 1.01 }, image: "👤" },
  { id: "a1b2c3d4-0017-0000-0000-000000000017", name: "Shadow Knight",  rank: "C", ability: "Knight Guard",       buff: { stat: "vitality",     multiplier: 1.04 }, image: "🛡️" },
];

export const calculateModifiedStats = (state: GameState) => {
  const mod = { ...state.stats };
  state.shadows.forEach(sid => {
    const s = SHADOWS_DB.find(x => x.id === sid);
    if (s) {
       const cur = mod[s.buff.stat] as number;
       (mod[s.buff.stat] as number) = Math.round(cur * s.buff.multiplier);
    }
  });
  return mod;
};

export const attemptExtraction = (rank: string) => Math.random() < 0.1;

// ── WEIGHTED POOL ──────────────────────────────────────────────────────────
// Exact bucket percentages from CONTEXT.md decisions.
// Values represent relative weight per shadow rank for each hunter rank tier.
// E/D bucket:  E-hunter=70%, D-hunter=55%, C-hunter=35%, B-hunter=20%, A-hunter=10%, S-hunter=~20%
// C/B bucket:  E-hunter=25%, D-hunter=35%, C-hunter=45%, B-hunter=45%, A-hunter=35%, S-hunter=~33%
// A/S bucket:  E-hunter=5%,  D-hunter=10%, C-hunter=20%, B-hunter=35%, A-hunter=55%, S-hunter=~47%
// Normalised to integer weights that reproduce those ratios (sum ~100 per hunter rank):
export const RANK_WEIGHTS: Record<string, Record<string, number>> = {
  E: { E: 40, D: 30, C: 15, B: 10, A: 3,  S: 2  },  // E/D=70%, C/B=25%, A/S=5%
  D: { E: 30, D: 25, C: 20, B: 15, A: 7,  S: 3  },  // E/D=55%, C/B=35%, A/S=10%
  C: { E: 20, D: 15, C: 25, B: 20, A: 13, S: 7  },  // E/D=35%, C/B=45%, A/S=20%
  B: { E: 10, D: 10, C: 23, B: 22, A: 22, S: 13 },  // E/D=20%, C/B=45%, A/S=35%
  A: { E: 5,  D: 5,  C: 15, B: 20, A: 33, S: 22 },  // E/D=10%, C/B=35%, A/S=55%
  S: { E: 10, D: 10, C: 17, B: 16, A: 24, S: 23 },  // ~even distribution
};

/**
 * Build a weighted pool of unowned shadows for a given hunter rank.
 * Each shadow appears N times in the array proportional to its weight.
 * Random selection: pool[Math.floor(Math.random() * pool.length)]
 */
export function buildWeightedPool(hunterRank: string, ownedIds: Set<string>): Shadow[] {
  const weights = RANK_WEIGHTS[hunterRank] ?? RANK_WEIGHTS["E"];
  const pool: Shadow[] = [];
  for (const shadow of SHADOWS_DB) {
    if (ownedIds.has(shadow.id)) continue;
    const w = weights[shadow.rank] ?? 1;
    for (let i = 0; i < w; i++) pool.push(shadow);
  }
  return pool;
}
