"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameState, rankAtLevel, xpForLevel } from "@/lib/gameReducer";
import { nextRankInfo } from "@/lib/game/xpEngine";
import type { HunterRank } from "@/lib/game/xpEngine";
import { 
  RANK_COLORS, RANK_LABELS, JOB_CLASS_ICONS, JOB_CLASS_COLORS 
} from "@/lib/constants";
import {
  LayoutDashboard, Ghost, Package, DoorOpen, Swords, Zap,
  Settings2, Plus, Bell, X, Shield, Sparkles, Activity, Swords as SwordsIcon, Trophy, Users
} from "lucide-react";
import BossEvent from "./BossEvent";
import ShadowArmy from "./ShadowArmy";
import Inventory from "./Inventory";
import DungeonGate from "./DungeonGate";
import Arena from "./Arena";
import Profile from "./Profile";
import QuestBoard from "./QuestBoard";
import WorkoutEngine from "./WorkoutEngine";
import Settings from "./Settings";
import Leaderboard from "./Leaderboard";
import GuildHall from "./GuildHall";
import AchievementHall from "./AchievementHall";
import RankTrialEngine from "./RankTrialEngine";
import RankUpCeremony from "./RankUpCeremony";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { systemAudio } from "@/lib/audio";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  state: GameState;
  dispatch: React.Dispatch<any>;
}

export default function Dashboard({ state, dispatch }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"STATUS" | "SHADOWS" | "STORAGE" | "GATES" | "ARENA" | "GUILD">("STATUS");
  const [showProfile, setShowProfile] = useState(false);
  const [showQuestBoard, setShowQuestBoard] = useState(false);
  const [showWorkout, setShowWorkout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showTrial, setShowTrial] = useState(false);
  const [showRankUp, setShowRankUp] = useState(false);
  const [rankUpResult, setRankUpResult] = useState<{
    oldRank: string; newRank: string; xpBonus: number; statPoints: number;
  } | null>(null);

  const { user, stats, dailyQuests, chapters, shadows } = state;
  const rank = rankAtLevel(user.level);
  const xpMax = xpForLevel(user.level);

  const prevRankRef = useRef<string>(rank);
  const [arenaJustUnlocked, setArenaJustUnlocked] = useState(false);

  useEffect(() => {
    if (prevRankRef.current === "E" && rank !== "E") {
      setArenaJustUnlocked(true);
      const t = setTimeout(() => setArenaJustUnlocked(false), 4000);
      return () => clearTimeout(t);
    }
    prevRankRef.current = rank;
  }, [rank]);

  const RANK_D_LEVEL = 10;
  const rankDProgress = Math.min(100, Math.round(((user.level - 1) / (RANK_D_LEVEL - 1)) * 100));
  const levelsToRankD = Math.max(0, RANK_D_LEVEL - user.level);

  const completedAchievementIds: string[] = [
    ...(((stats?.totalWorkouts ?? 0) > 0) ? ["a1"] : []),          // FIRST BLOOD — first workout
    ...(((stats?.currentStreak ?? 0) >= 7) ? ["a2"] : []),          // IRON WILL — 7-day streak
    ...(((shadows?.length ?? 0) > 0) ? ["a10"] : []),               // FIRST SHADOW
    ...(((shadows?.length ?? 0) >= 10) ? ["a11"] : []),             // SHADOW MONARCH
  ];

  const TABS = [
    { id: "STATUS", label: "STATUS", icon: <LayoutDashboard size={20} /> },
    { id: "SHADOWS", label: "SHADOWS", icon: <Ghost size={20} /> },
    { id: "STORAGE", label: "STORAGE", icon: <Package size={20} /> },
    { id: "GATES", label: "GATES", icon: <DoorOpen size={20} /> },
    { id: "ARENA", label: "ARENA", icon: <Swords size={20} /> },
    { id: "GUILD", label: "GUILD", icon: <Users size={20} /> },
  ];

  const MOBILE_TABS = [
    { id: "STATUS",  label: "STATUS",  icon: <LayoutDashboard size={22} /> },
    { id: "GATES",   label: "GATES",   icon: <DoorOpen size={22} /> },
    { id: "STORAGE", label: "STORAGE", icon: <Package size={22} /> },
    { id: "ARENA",   label: "ARENA",   icon: <Swords size={22} /> },
  ];

  return (
    <div className="bg-[#030308] min-h-screen text-[#E2E8F0] font-exo relative overflow-hidden flex flex-col scanlines selection:bg-[#7C3AED]/30">
      <style jsx global>{`
        .scanlines {
          position: relative;
        }
        .scanlines::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.2) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
          background-size: 100% 3px, 3px 100%;
          pointer-events: none;
          z-index: 100;
        }
      `}</style>

      {/* ── BACKGROUND AMBIENCE ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#7C3AED]/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#06B6D4]/5 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* ── NAVIGATION LEFT BAR ── */}
      <nav className="fixed left-0 top-0 bottom-0 w-20 z-50 bg-[#080514]/80 backdrop-blur-3xl border-r border-[#7C3AED]/20 flex flex-col items-center py-10 hidden lg:flex">
         <div className="w-12 h-12 mb-12 flex items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#A855F7] rounded-[14px] shadow-[0_0_20px_rgba(124,58,237,0.4)] group cursor-pointer transition-all hover:scale-110 active:scale-95" onClick={() => setActiveTab("STATUS")}>
            <Zap size={24} className="text-[#030308]" />
         </div>

         <div className="flex-1 flex flex-col gap-8">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "p-4 rounded-xl transition-all relative group",
                  activeTab === tab.id ? "text-[#7C3AED] bg-[#7C3AED]/10" : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/5"
                )}
              >
                <div className={cn("transition-transform group-hover:scale-110", activeTab === tab.id && "drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]")}>
                  {tab.icon}
                </div>
                {activeTab === tab.id && (
                  <motion.div layoutId="nav-line" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#7C3AED] rounded-r-full shadow-[0_0_10px_#7C3AED]" />
                )}
              </button>
            ))}
         </div>

         <button onClick={() => setShowSettings(true)} className="p-4 text-[#94A3B8] hover:text-[#E2E8F0] transition-colors group">
            <Settings2 size={24} className="group-hover:rotate-90 transition-transform" />
         </button>
      </nav>

      <div className="lg:pl-20 flex-1 flex flex-col relative z-10 h-full overflow-hidden">
        {/* ── TOP HEADER ── */}
        <header className="px-10 py-8 flex items-center justify-between bg-gradient-to-b from-[#030308]/95 to-transparent border-b border-white/5">
          <div className="flex items-center gap-8">
            <div className="relative cursor-pointer group" onClick={() => setShowProfile(true)}>
               <div className="w-20 h-20 bg-[#080514] border border-[#7C3AED]/40 rounded-2xl flex items-center justify-center transition-all group-hover:border-[#7C3AED] group-hover:shadow-[0_0_25px_rgba(124,58,237,0.4)] group-hover:scale-105 active:scale-95 overflow-hidden">
                  <span className="text-5xl filter grayscale group-hover:grayscale-0 transition-all duration-500">{JOB_CLASS_ICONS[user.jobClass as keyof typeof JOB_CLASS_ICONS] || "👤"}</span>
               </div>
               <div className="absolute -bottom-2 -right-2 system-readout text-[10px] bg-[#D97706] text-[#030308] px-3 py-1 rounded-md font-black border border-[#030308] shadow-[0_10px_20px_rgba(217,119,6,0.3)] tracking-tighter">
                 {rank}_RANK
               </div>
            </div>

            <div>
              <div className="flex items-center gap-6 mb-3">
                <h1 className="text-3xl font-black text-[#E2E8F0] tracking-tight">{user.username}</h1>
                <div className="px-4 py-1.5 bg-[#7C3AED]/10 border border-[#7C3AED]/30 rounded-lg shadow-xl">
                   <span className="system-readout text-[11px] text-[#A855F7] font-black uppercase">LVL_{user.level}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="w-64 md:w-96 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(user.currentXp / xpMax) * 100}%` }}
                      className="h-full bg-gradient-to-r from-[#06B6D4] via-[#38BDF8] to-[#7C3AED] shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                    />
                 </div>
                 <span className="system-readout text-[10px] text-[#06B6D4] font-black opacity-80 tracking-widest uppercase">
                   {Math.floor((user.currentXp / xpMax) * 100)}%_SYNC
                 </span>
              </div>
              {/* Compact rank progression HUD — shows XP gate toward next rank */}
              {(() => {
                const nextInfo = nextRankInfo(user.rank as HunterRank);
                const totalXp = user.stats?.totalXpEarned ?? 0;
                if (!nextInfo.nextRank) {
                  return (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="system-readout text-[9px] text-[#D97706] font-black tracking-widest uppercase">
                        MAX RANK
                      </span>
                    </div>
                  );
                }
                const xpPct = Math.min(100, (totalXp / nextInfo.xpThreshold) * 100);
                return (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="system-readout text-[9px] text-[#94A3B8] font-black tracking-widest uppercase">
                      RANK {user.rank} → {nextInfo.nextRank}
                    </span>
                    <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        animate={{ width: `${xpPct}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#D97706] to-[#F59E0B]"
                      />
                    </div>
                    <span className="system-readout text-[9px] text-[#D97706] font-black tabular-nums">
                      {totalXp.toLocaleString()}/{nextInfo.xpThreshold.toLocaleString()}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden xl:flex items-center gap-10 mr-8">
                {(() => {
                  const staminaMax = (stats?.vitality ?? 10) * 10;
                  const manaVal    = (user.level ?? 1) * (stats?.intelligence ?? 10);
                  return [
                    { label: "STAMINA", val: `${staminaMax}/${staminaMax}`, col: "text-[#22C55E]" },
                    { label: "MANA",    val: manaVal.toLocaleString(),       col: "text-[#7C3AED]" },
                  ];
                })().map(s => (
                  <div key={s.label}>
                    <div className="system-readout text-[9px] text-[#94A3B8] mb-1 font-black tracking-widest">{s.label}</div>
                    <div className={cn("system-readout text-[13px] font-black", s.col)}>{s.val}</div>
                  </div>
                ))}
             </div>
             
             <button onClick={() => setShowQuestBoard(true)} className="p-4 bg-[#080514]/80 border border-white/10 rounded-2xl hover:border-[#7C3AED]/50 hover:bg-[#7C3AED]/10 transition-all relative group active:scale-95 shadow-xl">
                <Bell size={24} className="text-[#E2E8F0] group-hover:animate-swing" />
                <div className="absolute top-4 right-4 w-2 h-2 bg-[#EF4444] rounded-full shadow-[0_0_10px_#EF4444] animate-pulse" />
             </button>
             
             <button onClick={() => setShowWorkout(true)} 
                     className="px-8 py-4 bg-gradient-to-r from-[#06B6D4] to-[#38BDF8] text-[#030308] font-orbitron font-black text-[11px] tracking-[0.3em] rounded-2xl shadow-[0_15px_35px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border-t border-white/20">
                <Plus size={18} strokeWidth={4} />
                ARISE
             </button>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto p-12 no-scrollbar pb-40">
          <AnimatePresence mode="wait">
            {activeTab === "STATUS" && (
              <motion.div key="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-7xl mx-auto space-y-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                    { label: "STRENGTH", val: stats.strength, icon: <Zap size={22} />, color: "text-[#EF4444]", glow: "shadow-[0_0_30px_rgba(239,68,68,0.2)]" },
                    { label: "AGILITY", val: stats.agility, icon: <Sparkles size={22} />, color: "text-[#38BDF8]", glow: "shadow-[0_0_30px_rgba(56,189,248,0.2)]" },
                    { label: "VITALITY", val: stats.vitality, icon: <Shield size={22} />, color: "text-[#22C55E]", glow: "shadow-[0_0_30px_rgba(34,197,94,0.2)]" },
                    { label: "INTEL", val: stats.intelligence, icon: <Activity size={22} />, color: "text-[#A855F7]", glow: "shadow-[0_0_30px_rgba(168,85,247,0.2)]" },
                  ].map((s) => (
                    <div key={s.label} className={cn("system-panel p-8 relative group transition-all hover:bg-white/[0.04]", s.glow)}>
                       <div className="flex justify-between items-start mb-8">
                          <span className="system-readout text-[11px] text-[#94A3B8] font-black tracking-widest">{s.label}</span>
                          <span className={cn("transition-all group-hover:scale-125 duration-700", s.color)}>{s.icon}</span>
                       </div>
                       <div className="text-5xl font-orbitron font-black text-[#E2E8F0] tracking-widest">{s.val}</div>
                       <div className="mt-6 h-[2px] w-0 group-hover:w-full bg-current transition-all duration-700 opacity-20" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 items-start">
                   <div className="xl:col-span-2 space-y-12">
                      <div className="system-panel p-10 border-[#7C3AED]/30 bg-[#080514]/40 shadow-2xl backdrop-blur-xl">
                         <div className="flex justify-between items-center mb-12">
                            <div>
                               <h2 className="text-2xl font-black text-[#E2E8F0] tracking-tight uppercase italic underline underline-offset-8 decoration-[#7C3AED]/40">Active Investigations</h2>
                               <p className="system-readout text-[10px] text-[#94A3B8] mt-3 italic tracking-wide">SYSTEM_MESSAGES_SYNCED</p>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="system-readout text-[10px] text-[#EF4444] font-black animate-pulse uppercase tracking-widest">PENALTY_IMMESH_RISK</span>
                              <span className="system-readout text-[14px] text-white font-black mt-1 tabular-nums">18:42:09</span>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(dailyQuests || []).slice(0, 4).map((q: any) => (
                              <div key={q.id} className="p-8 bg-[#030308] border border-white/5 rounded-[24px] hover:border-[#7C3AED]/50 transition-all duration-500 flex items-center gap-8 group cursor-pointer relative overflow-hidden">
                                 <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                 <div className="text-5xl filter grayscale group-hover:grayscale-0 group-hover:scale-125 transition-all duration-500 relative z-10">{q.icon}</div>
                                 <div className="flex-1 min-w-0 relative z-10">
                                    <div className="flex justify-between items-end mb-3">
                                       <span className="system-readout text-[13px] font-black text-[#E2E8F0] uppercase tracking-wide">{q.name}</span>
                                       <span className="system-readout text-[12px] text-[#06B6D4] font-black tabular-nums">{q.current || 0}/{q.target}</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                       <motion.div initial={{ width: 0 }} animate={{ width: `${(q.current/q.target)*100}%` }} className="h-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] shadow-[0_0_15px_#7C3AED]" />
                                    </div>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                      <BossEvent state={state} dispatch={dispatch} />
                   </div>
                   <div className="space-y-12">
                      <div className="system-panel p-10 border-[#06B6D4]/30 bg-[#030308]/60 backdrop-blur-3xl shadow-2xl">
                         <h2 className="text-[12px] font-black text-[#06B6D4] mb-10 system-readout tracking-[0.5em] uppercase italic">SYSTEM_LOGS</h2>
                         <div className="space-y-5">
                            {chapters?.slice(0, 5).map((ch: any) => (
                              <div key={ch.id} className={cn("p-5 rounded-2xl border flex items-center justify-between transition-all", ch.unlocked ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer" : "border-white/5 opacity-20 grayscale")}>
                                 <div className="flex items-center gap-5">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[11px] font-black text-[#94A3B8] border border-white/5 uppercase">{ch.id}</div>
                                    <div>
                                       <div className="system-readout text-[12px] font-black text-white uppercase">{ch.title}</div>
                                       <div className="system-readout text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest mt-1">VERIFIED_LOG</div>
                                    </div>
                                 </div>
                                 {ch.unlocked && <Sparkles size={16} className="text-[#06B6D4] drop-shadow-[0_0_8px_#06B6D4]" />}
                              </div>
                            ))}
                         </div>
                      </div>
                      <div className="system-panel p-10 bg-gradient-to-br from-[#7C3AED]/20 to-transparent border-[#7C3AED]/40 shadow-2xl group cursor-pointer" onClick={() => setActiveTab("SHADOWS")}>
                         <h3 className="system-readout text-[11px] text-[#94A3B8] mb-4 font-black tracking-widest uppercase">SHADOW_ARMY_COMMAND</h3>
                         <div className="flex items-end justify-between">
                            <div className="text-6xl font-orbitron font-black text-[#7C3AED] drop-shadow-[0_0_20px_#7C3AED] group-hover:scale-110 transition-transform">{shadows?.length || 0}</div>
                            <div className="system-readout text-[10px] text-[#7C3AED] font-black tracking-widest animate-pulse uppercase">ARISE →</div>
                         </div>
                      </div>
                      <div
                        className="system-panel p-10 bg-gradient-to-br from-[#D97706]/20 to-transparent border-[#D97706]/40 shadow-2xl group cursor-pointer"
                        onClick={() => setShowLeaderboard(true)}
                      >
                        <h3 className="system-readout text-[11px] text-[#94A3B8] mb-4 font-black tracking-widest uppercase">WORLD_RANKINGS</h3>
                        <div className="flex items-end justify-between">
                          <Trophy size={36} className="text-[#D97706] drop-shadow-[0_0_20px_#D97706] group-hover:scale-110 transition-transform" />
                          <div className="system-readout text-[10px] text-[#D97706] font-black tracking-widest animate-pulse uppercase">VIEW →</div>
                        </div>
                      </div>
                      <div
                        className="system-panel p-10 bg-gradient-to-br from-[#D97706]/20 to-transparent border-[#D97706]/40 shadow-2xl group cursor-pointer"
                        onClick={() => setShowAchievements(true)}
                      >
                        <h3 className="system-readout text-[11px] text-[#94A3B8] mb-4 font-black tracking-widest uppercase flex items-center gap-2">
                          <Trophy size={14} className="text-[#D97706]" />
                          ACHIEVEMENTS
                        </h3>
                        {completedAchievementIds.length > 0 ? (
                          <div className="space-y-2 mb-4">
                            {completedAchievementIds.slice(0, 3).map(id => {
                              const names: Record<string, string> = { a1: "FIRST BLOOD", a2: "IRON WILL", a10: "FIRST SHADOW", a11: "SHADOW MONARCH" };
                              return (
                                <div key={id} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#D97706] shadow-[0_0_6px_rgba(217,119,6,0.6)]" />
                                  <span className="system-readout text-[10px] text-[#E2E8F0] font-black uppercase tracking-wide">{names[id] ?? id}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="system-readout text-[10px] text-[#94A3B8] italic mb-4">No achievements yet. Start training.</p>
                        )}
                        <div className="system-readout text-[10px] text-[#D97706] font-black tracking-widest animate-pulse uppercase">View All →</div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === "SHADOWS" && (
              <motion.div key="shadows" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto">
                <ShadowArmy userId={user.id} shadows={shadows} stats={stats} />
              </motion.div>
            )}

            {activeTab === "STORAGE" && (
              <motion.div key="inv" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-7xl mx-auto">
                <Inventory
                  userId={user.id}
                  dispatch={dispatch}
                  onEquipChange={async () => {
                    const { getUserInventory } = await import("@/lib/services/inventoryService");
                    const invItems = await getUserInventory(user.id);
                    // Compute total bonus per stat from equipped items
                    const STAT_KEYS = ["strength","vitality","agility","intelligence","perception","sense"] as const;
                    const bonuses: Record<string, number> = {};
                    for (const invItem of invItems) {
                      if (!invItem.equipped || !invItem.items?.effects) continue;
                      for (const [key, val] of Object.entries(invItem.items.effects)) {
                        if (STAT_KEYS.includes(key as any) && typeof val === "number") {
                          bonuses[key] = (bonuses[key] ?? 0) + val;
                        }
                      }
                    }
                    // Re-derive base stats from user.stats (stats without item bonuses)
                    // We patch state.stats directly — base values stored in state.user.stats
                    const base = state.user.stats;
                    if (!base) return;
                    dispatch({
                      type: "SET_DATA",
                      payload: {
                        stats: {
                          ...stats,
                          strength:     (base.strength     ?? 10) + (bonuses.strength     ?? 0),
                          vitality:     (base.vitality     ?? 10) + (bonuses.vitality     ?? 0),
                          agility:      (base.agility      ?? 10) + (bonuses.agility      ?? 0),
                          intelligence: (base.intelligence ?? 10) + (bonuses.intelligence ?? 0),
                          perception:   (base.perception   ?? 10) + (bonuses.perception   ?? 0),
                          sense:        (base.sense        ?? 10) + (bonuses.sense        ?? 0),
                        },
                      },
                    });
                  }}
                />
              </motion.div>
            )}

            {activeTab === "GATES" && (
              <motion.div key="gates" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-7xl mx-auto">
                <DungeonGate isOpen={true} onEnter={() => setShowWorkout(true)} />
              </motion.div>
            )}

            {activeTab === "ARENA" && (
              <motion.div key="arena" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto py-20">
                {arenaJustUnlocked && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-8 p-6 border border-[#22C55E]/60 rounded-2xl bg-[#22C55E]/10 text-center shadow-[0_0_40px_rgba(34,197,94,0.2)]"
                  >
                    <p className="font-orbitron font-black text-[#22C55E] text-lg tracking-[0.3em] uppercase animate-pulse">
                      COMBAT AUTHORIZATION GRANTED
                    </p>
                  </motion.div>
                )}
                {rank === "E" ? (
                  <div className="system-panel p-20 text-center border-[#EF4444]/30 bg-[#120505]/40 backdrop-blur-2xl shadow-[0_0_100px_rgba(239,68,68,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#EF4444]/50 to-transparent" />
                    <SwordsIcon size={80} className="text-[#EF4444] mx-auto mb-10 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse" />
                    <h2 className="text-4xl font-orbitron font-black text-[#EF4444] mb-6 tracking-[0.3em] uppercase italic">Arena_Locked</h2>
                    <p className="system-readout text-[#94A3B8] text-sm max-w-lg mx-auto leading-relaxed mb-10 italic">
                      Combat authorization denied. PvP access restricted to Rank D hunters.
                      Current Rank: {rank}. Levels to Rank D: {levelsToRankD}.
                    </p>
                    <div className="max-w-xs mx-auto mb-10">
                      <div className="flex justify-between text-[10px] font-share-tech-mono text-[#94A3B8] mb-2 uppercase tracking-widest">
                        <span>Rank E</span>
                        <span>{rankDProgress}%</span>
                        <span>Rank D</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rankDProgress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-[#EF4444] to-[#7C3AED] shadow-[0_0_10px_rgba(124,58,237,0.6)]"
                        />
                      </div>
                    </div>
                    <button onClick={() => setActiveTab("STATUS")} className="px-10 py-4 border border-[#EF4444]/40 text-[#EF4444] font-orbitron font-black text-[11px] tracking-widest hover:bg-[#EF4444]/10 transition-all uppercase rounded-xl">Revert_to_Safety</button>
                    <div className="absolute bottom-4 right-8 opacity-10 text-[8px] font-black text-[#EF4444] uppercase tracking-[0.5em]">Warning: Neural feedback hazard</div>
                  </div>
                ) : (
                  <Arena state={state} dispatch={dispatch} onClose={() => setActiveTab("STATUS")} />
                )}
              </motion.div>
            )}
            {activeTab === "GUILD" && (
              <motion.div key="guild" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto">
                <GuildHall state={state} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showProfile && (
          <Profile
            state={state}
            onClose={() => setShowProfile(false)}
            onTrialStart={() => { setShowProfile(false); setShowTrial(true); }}
          />
        )}
        {showQuestBoard && <QuestBoard state={state} dispatch={dispatch} onClose={() => setShowQuestBoard(false)} />}
        {showWorkout && <WorkoutEngine state={state} dispatch={dispatch} onClose={() => setShowWorkout(false)} />}
        {showTrial && (
          <RankTrialEngine
            state={state}
            dispatch={dispatch}
            onClose={() => setShowTrial(false)}
            onTrialPass={(result) => {
              setShowTrial(false);
              setRankUpResult(result);
              setShowRankUp(true);
            }}
          />
        )}
        {showRankUp && rankUpResult && (
          <RankUpCeremony
            oldRank={rankUpResult.oldRank}
            newRank={rankUpResult.newRank}
            xpBonus={rankUpResult.xpBonus}
            statPoints={rankUpResult.statPoints}
            dispatch={dispatch}
            onDismiss={() => {
              setShowRankUp(false);
              setRankUpResult(null);
              // Rank state was already updated by dispatch({ type: "SET_USER" }) inside
              // RankTrialEngine.handleTrialPass when /api/rank/advance responded successfully.
              // No additional SET_USER dispatch needed here.
            }}
          />
        )}
        {showSettings && <Settings state={state} dispatch={dispatch} onClose={() => setShowSettings(false)} />}
        {showLeaderboard && <Leaderboard state={state} onClose={() => setShowLeaderboard(false)} />}
        {showAchievements && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed inset-0 z-[200] bg-[#030308] overflow-y-auto"
          >
            <AchievementHall onClose={() => setShowAchievements(false)} completedIds={completedAchievementIds} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="fixed bottom-6 left-6 opacity-10 text-[8px] tracking-[0.4em] pointer-events-none uppercase font-black z-50">ARISE_SYSTEM_V4.0_STABLE</div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080514]/95 backdrop-blur-3xl border-t border-[#7C3AED]/20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {MOBILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as "STATUS" | "SHADOWS" | "STORAGE" | "GATES" | "ARENA");
              systemAudio?.playClick();
            }}
            className={cn(
              "flex-1 flex flex-col items-center py-3 gap-1 transition-all",
              activeTab === tab.id
                ? "text-[#7C3AED] drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]"
                : "text-[#94A3B8] hover:text-[#E2E8F0]"
            )}
          >
            {tab.icon}
            <span className="text-[8px] font-orbitron font-black tracking-widest uppercase">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
