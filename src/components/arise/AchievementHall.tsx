"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Dumbbell, Users, BookOpen,
  Trophy, Lock, Star, Flame, Shield, Zap, Crown,
  Target, Heart, Ghost, Timer, Award
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Category = "ALL" | "FITNESS" | "SOCIAL" | "COLLECTION";
type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: Exclude<Category, "ALL">;
  rarity: Rarity;
  xpReward: number;
  completed: boolean;
  progress: number; // 0-100
  Icon: React.ElementType;
}

const ACHIEVEMENTS: Achievement[] = [
  // FITNESS
  { id: "a1",  name: "FIRST BLOOD",        description: "Complete your first workout session.",                 category: "FITNESS",    rarity: "COMMON",    xpReward: 200,   completed: true,  progress: 100, Icon: Dumbbell  },
  { id: "a2",  name: "IRON WILL",           description: "Complete 7 daily quests in a row.",                   category: "FITNESS",    rarity: "RARE",      xpReward: 1500,  completed: true,  progress: 100, Icon: Flame     },
  { id: "a3",  name: "SHADOW PROTOCOL",     description: "Complete 100 push-ups in a single session.",          category: "FITNESS",    rarity: "UNCOMMON",  xpReward: 800,   completed: true,  progress: 100, Icon: Dumbbell  },
  { id: "a4",  name: "CENTURY RUNNER",      description: "Accumulate 100 km of cardio total.",                  category: "FITNESS",    rarity: "EPIC",      xpReward: 5000,  completed: false, progress: 43,  Icon: Zap       },
  { id: "a5",  name: "MONARCH'S DISCIPLINE",description: "Maintain a 30-day workout streak.",                   category: "FITNESS",    rarity: "LEGENDARY", xpReward: 20000, completed: false, progress: 17,  Icon: Crown     },
  // SOCIAL
  { id: "a6",  name: "GUILD INITIATE",      description: "Join a hunter guild.",                                category: "SOCIAL",     rarity: "COMMON",    xpReward: 300,   completed: true,  progress: 100, Icon: Users     },
  { id: "a7",  name: "COMRADES IN ARMS",    description: "Complete a group dungeon with 3+ hunters.",           category: "SOCIAL",     rarity: "UNCOMMON",  xpReward: 750,   completed: true,  progress: 100, Icon: Shield    },
  { id: "a8",  name: "GUILD MASTER",        description: "Found your own hunter guild.",                        category: "SOCIAL",     rarity: "RARE",      xpReward: 3000,  completed: false, progress: 0,   Icon: Crown     },
  { id: "a9",  name: "THE NETWORK",         description: "Add 10 hunters as friends.",                          category: "SOCIAL",     rarity: "COMMON",    xpReward: 500,   completed: false, progress: 60,  Icon: Users     },
  // COLLECTION
  { id: "a10", name: "FIRST SHADOW",        description: "Extract your first shadow soldier.",                  category: "COLLECTION", rarity: "UNCOMMON",  xpReward: 1000,  completed: true,  progress: 100, Icon: Ghost     },
  { id: "a11", name: "SHADOW MONARCH",      description: "Extract 10 shadow soldiers into your army.",          category: "COLLECTION", rarity: "LEGENDARY", xpReward: 25000, completed: false, progress: 60,  Icon: Ghost     },
  { id: "a12", name: "ARCHIVE READER",      description: "Unlock and read your first chapter reward.",          category: "COLLECTION", rarity: "COMMON",    xpReward: 400,   completed: true,  progress: 100, Icon: BookOpen  },
  { id: "a13", name: "LORE KEEPER",         description: "Unlock 5 manhwa chapter rewards.",                    category: "COLLECTION", rarity: "RARE",      xpReward: 4000,  completed: false, progress: 40,  Icon: BookOpen  },
];

const RARITY_STYLES: Record<Rarity, { border: string; glow: string; label: string; bar: string }> = {
  COMMON:    { border: "border-slate-500/30",  glow: "",                                              label: "text-slate-400",  bar: "#64748b" },
  UNCOMMON:  { border: "border-emerald-500/40",glow: "",                                              label: "text-emerald-400",bar: "#22c55e" },
  RARE:      { border: "border-cyan-500/50",   glow: "",                                              label: "text-cyan-400",   bar: "#06b6d4" },
  EPIC:      { border: "border-purple-500/60", glow: "shadow-[0_0_12px_rgba(168,85,247,0.2)]",       label: "text-purple-400", bar: "#a855f7" },
  LEGENDARY: { border: "border-amber-500/70",  glow: "shadow-[0_0_20px_rgba(217,119,6,0.25)]",      label: "text-amber-400",  bar: "#f59e0b" },
};

const CATEGORY_ICONS: Record<Exclude<Category, "ALL">, React.ElementType> = {
  FITNESS:    Dumbbell,
  SOCIAL:     Users,
  COLLECTION: BookOpen,
};

const TABS: Category[] = ["ALL", "FITNESS", "SOCIAL", "COLLECTION"];

export default function AchievementHall({ onClose, completedIds }: { onClose?: () => void; completedIds?: string[] }) {
  const [activeTab, setActiveTab] = useState<Category>("ALL");

  // Apply real-data overrides from parent
  const resolvedAchievements = ACHIEVEMENTS.map(a =>
    completedIds?.includes(a.id) ? { ...a, completed: true, progress: 100 } : a
  );
  const filtered = activeTab === "ALL"
    ? resolvedAchievements
    : resolvedAchievements.filter(a => a.category === activeTab);
  const completed = resolvedAchievements.filter(a => a.completed).length;
  const totalXp = resolvedAchievements.filter(a => a.completed).reduce((s, a) => s + a.xpReward, 0);

  const countFor = (cat: Category) =>
    cat === "ALL" ? resolvedAchievements.length : resolvedAchievements.filter(a => a.category === cat).length;

  return (
    <div className="min-h-full bg-[#030308] font-exo p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(217,119,6,0.6)]" />
            <span className="text-[10px] font-share-tech-mono text-amber-500 tracking-[0.4em] uppercase">
              SYSTEM_HONOR_ARCHIVE
            </span>
          </div>
          <h1 className="text-3xl font-orbitron font-black text-white tracking-widest uppercase flex items-center gap-3">
            <Trophy size={28} className="text-amber-500" />
            Achievement Hall
          </h1>
          <p className="text-xs font-share-tech-mono text-slate-500 mt-2 tracking-widest">
            {completed} / {resolvedAchievements.length} Unlocked · {totalXp.toLocaleString()} XP Earned
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors p-1">✕</button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-8 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-orbitron font-black tracking-widest uppercase whitespace-nowrap rounded transition-all",
              activeTab === tab
                ? "bg-purple-700 text-white"
                : "bg-white/[0.04] text-slate-500 hover:text-slate-300 border border-white/5"
            )}
          >
            {tab}
            <span className={cn(
              "px-1 py-0.5 rounded text-[8px]",
              activeTab === tab ? "bg-purple-900 text-purple-300" : "bg-white/5 text-slate-600"
            )}>
              {countFor(tab)}
            </span>
          </button>
        ))}
      </div>

      {/* Achievement grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((ach, i) => {
          const style = RARITY_STYLES[ach.rarity];
          const CatIcon = CATEGORY_ICONS[ach.category];
          const isLocked = !ach.completed && ach.progress === 0;

          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={cn(
                "relative p-5 rounded border overflow-hidden transition-all",
                style.border, style.glow,
                "bg-[rgba(8,5,20,0.92)] backdrop-blur-sm",
                isLocked && "opacity-50"
              )}
            >
              {/* Locked overlay */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 rounded">
                  <Lock size={24} className="text-slate-500" />
                </div>
              )}

              {/* Completed glow */}
              {ach.completed && (
                <div className="absolute top-0 right-0 px-2 py-1 bg-amber-500/20 border-b border-l border-amber-500/40 rounded-bl text-[8px] font-orbitron text-amber-400 tracking-widest">
                  COMPLETED
                </div>
              )}

              <div className="flex gap-4">
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 w-12 h-12 rounded flex items-center justify-center border",
                  style.border
                )}
                  style={{ background: `${style.bar}15` }}>
                  <ach.Icon size={22} style={{ color: style.bar }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-xs font-orbitron font-black text-white truncate tracking-wider leading-tight">
                      {ach.name}
                    </h3>
                    <span className={cn("text-[8px] font-orbitron font-black tracking-widest flex-shrink-0", style.label)}>
                      {ach.rarity}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                    {ach.description}
                  </p>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${ach.progress}%` }}
                        transition={{ duration: 0.8, delay: i * 0.04 }}
                        className="h-full rounded-full"
                        style={{ background: style.bar, boxShadow: `0 0 6px ${style.bar}60` }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[8px] font-share-tech-mono text-slate-600 tracking-widest">
                        <CatIcon size={8} className="inline mr-1" />{ach.category}
                      </span>
                      <span className="text-[8px] font-share-tech-mono" style={{ color: style.bar }}>
                        {ach.completed ? "100%" : `${ach.progress}%`} · +{ach.xpReward.toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="mt-10 p-5 border border-cyan-900/30 rounded bg-cyan-900/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Star size={18} className="text-cyan-500" />
          <div>
            <p className="text-xs font-orbitron text-white font-black tracking-wider">HUNTER CORE POINTS</p>
            <p className="text-[9px] font-share-tech-mono text-slate-500 tracking-widest">GLOBAL SYNCHRONIZATION INDEX</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-share-tech-mono text-cyan-500 tracking-[0.3em]">INDEX SCORE</p>
          <p className="text-2xl font-orbitron font-black text-cyan-400">
            {(totalXp / 100).toFixed(0)} <span className="text-sm text-cyan-600">CPI</span>
          </p>
        </div>
      </div>
    </div>
  );
}
