export interface BossTemplate {
  id: string;
  name: string;
  rank: "E" | "D" | "C" | "B" | "A" | "S" | "NATIONAL" | "MONARCH";
  minLevelRequired: number;
  maxHp: number;
  baseXpReward: number;
  killXpBonus: number;
  description: string;
  abilities: string[];
  weaknesses: string[];
  origin: string;
  isBoss: boolean;
  isMonarch: boolean;
}

export const BOSS_ROSTER: BossTemplate[] = [
  // E/D Rank
  {
    id: "kasaka-venom-fang",
    name: "Blue Venom-Fanged Kasaka",
    rank: "C",
    minLevelRequired: 10,
    maxHp: 2000,
    baseXpReward: 100,
    killXpBonus: 50,
    description: "The giant snake boss of the Hapjeong Subway Station instance dungeon. Its scales are incredibly hard.",
    abilities: ["Venom Spit", "Crush", "Steel Scales"],
    weaknesses: ["Underbelly", "Blunt Force"],
    origin: "Chapter 13 - Hapjeong Station",
    isBoss: true,
    isMonarch: false,
  },
  {
    id: "cerberus-gatekeeper",
    name: "Cerberus: Gatekeeper of Hell",
    rank: "B",
    minLevelRequired: 15,
    maxHp: 5000,
    baseXpReward: 250,
    killXpBonus: 100,
    description: "A three-headed demonic hound guarding the entrance to the Demon Castle.",
    abilities: ["Rage", "Hellfire", "Triple Bite"],
    weaknesses: ["Agility", "Blind Spots"],
    origin: "Chapter 25 - Demon Castle Gate",
    isBoss: true,
    isMonarch: false,
  },
  
  // A Rank
  {
    id: "baruka-ice-elf",
    name: "Baruka: Lord of Ice",
    rank: "A",
    minLevelRequired: 25,
    maxHp: 12000,
    baseXpReward: 500,
    killXpBonus: 200,
    description: "The leader of the Ice Elves in the Red Gate. He moves effortlessly in freezing conditions.",
    abilities: ["Ice Prison", "Frost Storm", "Absolute Zero"],
    weaknesses: ["Fire", "Stamina Exhaustion"],
    origin: "Chapter 46 - Red Gate Arc",
    isBoss: true,
    isMonarch: false,
  },
  {
    id: "igris-red-knight",
    name: "Commander Blood-Red Igris",
    rank: "A",
    minLevelRequired: 30,
    maxHp: 15000,
    baseXpReward: 800,
    killXpBonus: 300,
    description: "The noble knight guarding the Empty Throne. He wields a massive greatsword with terrifying precision.",
    abilities: ["Dominator's Touch", "Heavy Cleave", "Telekinesis"],
    weaknesses: ["Magic", "Predictable Honor"],
    origin: "Chapter 39 - Job Change Arc",
    isBoss: true,
    isMonarch: false,
  },
  
  // S Rank
  {
    id: "kargalgan-orc-shaman",
    name: "Great Orc Shaman Kargalgan",
    rank: "S",
    minLevelRequired: 40,
    maxHp: 25000,
    baseXpReward: 1500,
    killXpBonus: 500,
    description: "Leader of the High Orcs. A master of curses, barriers, and fire magic.",
    abilities: ["Hymn of Fire", "Hymn of Protection", "Hymn of Blindness"],
    weaknesses: ["Assassination", "Anti-Magic"],
    origin: "Chapter 61 - Hunters Guild Gate",
    isBoss: true,
    isMonarch: false,
  },
  {
    id: "baran-demon-king",
    name: "Baran: Monarch of White Flames",
    rank: "S",
    minLevelRequired: 50,
    maxHp: 50000,
    baseXpReward: 3000,
    killXpBonus: 1000,
    description: "The King of Demons who reigns at the top of the Demon Castle. Rides a massive wyvern.",
    abilities: ["White Flames", "Demon Army Summon", "Lightning Breath"],
    weaknesses: ["Shadow Army", "Overwhelming Numbers"],
    origin: "Chapter 85 - Demon Castle Top Floor",
    isBoss: true,
    isMonarch: false,
  },
  {
    id: "beru-ant-king",
    name: "The Ant King",
    rank: "S",
    minLevelRequired: 60,
    maxHp: 80000,
    baseXpReward: 5000,
    killXpBonus: 2000,
    description: "The pinnacle of evolution born on Jeju Island. Possesses unimaginable speed and power.",
    abilities: ["Flight", "Poison Stinger", "Skill Absorption", "Hyper Regeneration"],
    weaknesses: ["None Detected"],
    origin: "Chapter 103 - Jeju Island Raid",
    isBoss: true,
    isMonarch: false,
  },

  // Monarchs
  {
    id: "legia-beast-monarch",
    name: "Legia: Monarch of Beasts",
    rank: "MONARCH",
    minLevelRequired: 75,
    maxHp: 150000,
    baseXpReward: 10000,
    killXpBonus: 3000,
    description: "The King of Beasts, commanding primal strength and spiritual pressure.",
    abilities: ["Spiritual Pressure", "Beast Transformation", "Shatter"],
    weaknesses: ["Light Magic", "Dragon Fear"],
    origin: "Chapter 155 - Monarch Arc",
    isBoss: true,
    isMonarch: true,
  },
  {
    id: "querehsha-plague-monarch",
    name: "Querehsha: Monarch of Plagues",
    rank: "MONARCH",
    minLevelRequired: 80,
    maxHp: 180000,
    baseXpReward: 12000,
    killXpBonus: 4000,
    description: "The Queen of Insects who spreads rot and decay with every breath.",
    abilities: ["Decaying Breath", "Parasite Swarm", "Lethal Toxicity"],
    weaknesses: ["Fire", "Complete Purification"],
    origin: "Chapter 158 - Monarch Arc",
    isBoss: true,
    isMonarch: true,
  },
  {
    id: "antares-dragon-monarch",
    name: "Antares: Monarch of Destruction",
    rank: "MONARCH",
    minLevelRequired: 100,
    maxHp: 500000,
    baseXpReward: 50000,
    killXpBonus: 20000,
    description: "The strongest of all Monarchs, capable of erasing existence with the breath of destruction.",
    abilities: ["Breath of Destruction", "Dragon Fear", "Absolute Defense"],
    weaknesses: ["Ruler's Authority", "Shadow Monarch"],
    origin: "Chapter 173 - Final Battle",
    isBoss: true,
    isMonarch: true,
  }
];
