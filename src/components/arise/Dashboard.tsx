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
import ChapterUnlockCeremony from "./ChapterUnlockCeremony";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
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
  const [showChapterUnlock, setShowChapterUnlock] = useState(false);
  const [chapterUnlockData, setChapterUnlockData] = useState<{
    title: string; number: number; externalUrl: string | null;
  } | null>(null);

  const { user, stats, dailyQuests, chapters, shadows } = state;
  const rank = rankAtLevel(user.level);
  const xpMax = xpForLevel(user.level);

  const prevRankRef = useRef<string>(rank);
  const [arenaJustUnlocked, setArenaJustUnlocked] = useState(false);
  const [extractionTokens, setExtractionTokens] = useState(0);
  const [penaltyCountdown, setPenaltyCountdown] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setPenaltyCountdown(`${h}:${m}:${s}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (prevRankRef.current === "E" && rank !== "E") {
      setArenaJustUnlocked(true);
      const t = setTimeout(() => setArenaJustUnlocked(false), 4000);
      return () => clearTimeout(t);
    }
    prevRankRef.current = rank;
  }, [rank]);

  // Fetch extraction tokens at mount — stored as local state (not in GameState)
  useEffect(() => {
    if (!user.id || user.id === "local-user") return;
    const fetchTokens = async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("users")
          .select("extraction_tokens")
          .eq("id", user.id)
          .maybeSingle();
        // Column may not exist on older DB instances — silently fall back to 0
        if (!error && data?.extraction_tokens !== undefined) {
          setExtractionTokens(data.extraction_tokens ?? 0);
        }
      } catch (err) {
        console.error("[Dashboard] Token fetch error:", err);
      }
    };
    fetchTokens();
  }, [user.id]);

  const handleChapterUnlocked = (newCount: number) => {
    // newCount is 1-based total unlocked; index of newly unlocked chapter is newCount - 1
    const newlyUnlocked = state.chapters?.[newCount - 1];
    if (!newlyUnlocked) return;
    // Valid URLs: only comix.to links (not webtoons list page)
    const validUrl = newlyUnlocked.externalUrl?.includes("comix.to")
      ? newlyUnlocked.externalUrl
      : null;
    setChapterUnlockData({
      title: newlyUnlocked.title,
      number: newCount,
      externalUrl: validUrl,
    });
    setShowChapterUnlock(true);
    // Update chapters[] in state to reflect new unlocked count
    const mappedChapters = state.chapters?.map((ch: any, idx: number) => ({
      ...ch,
      unlocked: idx < newCount,
    }));
    if (mappedChapters) {
      dispatch({ type: "SET_DATA", payload: { chapters: mappedChapters } });
    }
  };

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
    { id: "SHADOWS", label: "SHADOWS", icon: <Ghost size={22} /> },
    { id: "GUILD",   label: "GUILD",   icon: <Users size={22} /> },
  ];

  // Rank color helper
  const rankColors: Record<string, string> = {
    S: "#F59E0B", A: "#EF4444", B: "#8B5CF6", C: "#06B6D4", D: "#10B981", E: "#94A3B8"
  };
  const rankGlows: Record<string, string> = {
    S: "rgba(245,158,11,0.4)", A: "rgba(239,68,68,0.4)", B: "rgba(139,92,246,0.4)",
    C: "rgba(6,182,212,0.4)", D: "rgba(16,185,129,0.4)", E: "rgba(148,163,184,0.2)"
  };
  const currentRankColor = rankColors[rank] || "#94A3B8";
  const currentRankGlow  = rankGlows[rank]  || "rgba(148,163,184,0.2)";

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
        .system-readout {
          font-family: 'Share Tech Mono', monospace;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        @keyframes grid-drift {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 50px 50px, 50px 50px; }
        }
      `}</style>

      {/* ── BACKGROUND AMBIENCE ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#7C3AED]/10 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#06B6D4]/5 blur-[150px]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            animation: 'grid-drift 8s linear infinite',
          }}
        />
      </div>

      {/* ── NAVIGATION LEFT BAR ── */}
      <nav className="fixed left-0 top-0 bottom-0 w-20 z-50 bg-[#080514]/90 backdrop-blur-3xl border-r border-[#7C3AED]/20 flex flex-col items-center py-10 hidden lg:flex">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#7C3AED]/40 to-transparent" />

        {/* ARISE logo button */}
        <div
          className="w-12 h-12 mb-12 flex items-center justify-center rounded-[14px] cursor-pointer transition-all hover:scale-110 active:scale-95 relative"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #A855F7)",
            boxShadow: "0 0 25px rgba(124,58,237,0.5), 0 0 50px rgba(124,58,237,0.2)",
          }}
          onClick={() => setActiveTab("STATUS")}
        >
          <Zap size={24} className="text-[#030308]" />
          {/* Pulsing glow ring */}
          <div className="absolute -inset-1 rounded-[18px] animate-pulse opacity-30"
            style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)", filter: "blur(6px)" }} />
        </div>

        <div className="flex-1 flex flex-col gap-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setShowWorkout(false); }}
              className={cn(
                "relative p-4 rounded-xl transition-all group",
                activeTab === tab.id
                  ? "text-[#7C3AED] bg-[#7C3AED]/10"
                  : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/5"
              )}
              title={tab.label}
            >
              <div className={cn("transition-transform group-hover:scale-110 duration-300", activeTab === tab.id && "drop-shadow-[0_0_10px_rgba(124,58,237,0.9)]")}>
                {tab.icon}
              </div>
              {activeTab === tab.id && (
                <>
                  {/* Active indicator — left glow bar */}
                  <motion.div
                    layoutId="nav-line"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                    style={{ background: "#7C3AED", boxShadow: "0 0 12px rgba(124,58,237,1), 0 0 24px rgba(124,58,237,0.5)" }}
                  />
                  {/* Tooltip label */}
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[#0a0a14] border border-[#7C3AED]/30 text-[8px] font-mono font-black tracking-widest text-[#7C3AED] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {tab.label}
                  </div>
                </>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="p-4 text-[#94A3B8] hover:text-[#E2E8F0] transition-all group hover:bg-white/5 rounded-xl"
        >
          <Settings2 size={22} className="group-hover:rotate-90 transition-transform duration-500" />
        </button>
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#7C3AED]/20 to-transparent" />
      </nav>

      <div className="lg:pl-20 flex-1 flex flex-col relative z-10 h-full overflow-hidden">
        {/* ── TOP HEADER ── */}
        <header className="px-10 py-6 flex items-center justify-between border-b border-white/5 relative"
          style={{ background: "linear-gradient(to bottom, rgba(3,3,8,0.98) 0%, rgba(3,3,8,0.85) 100%)" }}
        >
          {/* Subtle header top accent */}
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(to right, transparent, ${currentRankColor}30, transparent)` }} />

          <div className="flex items-center gap-8">
            {/* Avatar with rank-colored glow ring */}
            <div className="relative cursor-pointer group" onClick={() => setShowProfile(true)}>
              {/* Rank glow ring */}
              <div
                className="absolute -inset-1 rounded-[20px] opacity-50 group-hover:opacity-80 transition-opacity animate-pulse"
                style={{ background: `linear-gradient(135deg, ${currentRankColor}40, transparent)`, filter: "blur(4px)" }}
              />
              <div
                className="relative w-18 h-18 flex items-center justify-center transition-all group-hover:scale-105 active:scale-95 overflow-hidden"
                style={{
                  width: 72, height: 72,
                  background: "#080514",
                  border: `2px solid ${currentRankColor}50`,
                  borderRadius: "18px",
                  boxShadow: `0 0 20px ${currentRankGlow}`,
                }}
              >
                <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all duration-500">
                  {JOB_CLASS_ICONS[user.jobClass as keyof typeof JOB_CLASS_ICONS] || "👤"}
                </span>
              </div>
              {/* Rank badge — rank-colored */}
              <div
                className="absolute -bottom-2 -right-2 system-readout text-[9px] px-2 py-0.5 rounded font-black border border-black/60 tracking-tight"
                style={{
                  background: currentRankColor,
                  color: "#030308",
                  boxShadow: `0 4px 12px ${currentRankGlow}`,
                }}
              >
                {rank}
              </div>
              {/* ONLINE indicator */}
              <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#030308]"
                style={{
                  background: "#10B981",
                  boxShadow: "0 0 8px rgba(16,185,129,0.8)",
                  animation: "online-pulse 2s ease-in-out infinite",
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1
                  className="text-2xl font-black text-[#E2E8F0] tracking-tight"
                  style={{ textShadow: `0 0 20px ${currentRankColor}40` }}
                >
                  {user.username}
                </h1>
                <div
                  className="px-3 py-1 rounded-lg"
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.3)",
                  }}
                >
                  <span className="system-readout text-[10px] text-[#A855F7] font-black">LVL_{user.level}</span>
                </div>
                {/* ONLINE status chip */}
                <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" style={{ animation: "online-pulse 2s ease-in-out infinite", boxShadow: "0 0 6px rgba(16,185,129,0.8)" }} />
                  <span className="system-readout text-[8px] text-[#10B981] font-black">ONLINE</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Animated XP bar */}
                <div className="relative h-2.5 rounded-full overflow-hidden border border-white/5" style={{ width: "min(384px, 60vw)", background: "rgba(255,255,255,0.04)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(user.currentXp / xpMax) * 100}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full xp-bar-gradient"
                  />
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: "stat-bar-shine 3s ease-in-out infinite" }} />
                </div>
                <span className="system-readout text-[10px] text-[#06B6D4] font-black tracking-widest">
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
             
             <button
               onClick={() => setShowWorkout(true)}
               className="relative px-8 py-4 text-[#030308] font-orbitron font-black text-[11px] tracking-[0.3em] rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 overflow-hidden group"
               style={{
                 background: "linear-gradient(135deg, #06B6D4, #38BDF8, #7C3AED)",
                 backgroundSize: "200% 200%",
                 animation: "header-gradient-shift 4s ease infinite",
                 boxShadow: "0 15px 35px rgba(6,182,212,0.4), 0 5px 15px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.25)",
               }}
             >
               {/* Shimmer sweep */}
               <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
               <Plus size={18} strokeWidth={4} className="relative z-10" />
               <span className="relative z-10">ARISE</span>
             </button>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto p-12 no-scrollbar pb-40">
          <AnimatePresence mode="wait">
            {activeTab === "STATUS" && (
              <motion.div key="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-7xl mx-auto space-y-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "STRENGTH",  val: stats.strength,     hexColor: "#EF4444", icon: <Zap size={20} /> },
                    { label: "AGILITY",   val: stats.agility,      hexColor: "#38BDF8", icon: <Sparkles size={20} /> },
                    { label: "VITALITY",  val: stats.vitality,     hexColor: "#22C55E", icon: <Shield size={20} /> },
                    { label: "INTEL",     val: stats.intelligence, hexColor: "#A855F7", icon: <Activity size={20} /> },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="relative group transition-all duration-500 hover:-translate-y-1 cursor-default"
                      style={{
                        background: `rgba(8,5,20,0.85)`,
                        backdropFilter: "blur(12px)",
                        border: `1px solid ${s.hexColor}20`,
                        borderRadius: "20px",
                        padding: "28px",
                        boxShadow: `0 0 0 0 ${s.hexColor}00`,
                        transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = `${s.hexColor}40`;
                        el.style.boxShadow = `0 0 30px ${s.hexColor}20, 0 10px 30px rgba(0,0,0,0.5)`;
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = `${s.hexColor}20`;
                        el.style.boxShadow = `0 0 0 0 ${s.hexColor}00`;
                      }}
                    >
                      {/* Corner top-left accent */}
                      <div className="absolute top-0 left-0 w-4 h-4" style={{ borderTop: `2px solid ${s.hexColor}40`, borderLeft: `2px solid ${s.hexColor}40`, borderTopLeftRadius: "20px" }} />
                      {/* Corner bottom-right accent */}
                      <div className="absolute bottom-0 right-0 w-4 h-4" style={{ borderBottom: `2px solid ${s.hexColor}20`, borderRight: `2px solid ${s.hexColor}20`, borderBottomRightRadius: "20px" }} />

                      <div className="flex justify-between items-start mb-6">
                        <span className="system-readout text-[10px] text-[#94A3B8] font-black tracking-widest">{s.label}</span>
                        <span
                          className="transition-transform group-hover:scale-125 duration-500"
                          style={{ color: s.hexColor, filter: `drop-shadow(0 0 6px ${s.hexColor}80)` }}
                        >
                          {s.icon}
                        </span>
                      </div>
                      <div
                        className="text-5xl font-orbitron font-black tracking-widest mb-5"
                        style={{ color: "#E2E8F0", textShadow: `0 0 20px ${s.hexColor}30` }}
                      >
                        {s.val}
                      </div>
                      {/* Animated stat bar */}
                      <div className="h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (s.val / 100) * 100)}%` }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                          className="h-full"
                          style={{ background: `linear-gradient(90deg, ${s.hexColor}80, ${s.hexColor})`, boxShadow: `0 0 8px ${s.hexColor}60` }}
                        />
                      </div>
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
                              <span className="system-readout text-[14px] text-white font-black mt-1 tabular-nums">{penaltyCountdown}</span>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(dailyQuests || []).slice(0, 4).map((q: any) => {
                              const pct = Math.min(100, ((q.current || 0) / q.target) * 100);
                              const isComplete = pct >= 100;
                              const diffColor = q.difficulty === "HARD" ? "#EF4444" : q.difficulty === "EASY" ? "#10B981" : "#06B6D4";
                              return (
                                <div
                                  key={q.id}
                                  className="flex items-center gap-5 group cursor-pointer relative overflow-hidden transition-all duration-500"
                                  style={{
                                    padding: "20px",
                                    background: isComplete ? "rgba(6,182,212,0.04)" : "rgba(3,3,8,0.8)",
                                    border: `1px solid ${isComplete ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.05)"}`,
                                    borderLeft: `3px solid ${isComplete ? "#06B6D4" : diffColor}`,
                                    borderRadius: "20px",
                                    boxShadow: isComplete ? "0 0 20px rgba(6,182,212,0.08)" : "none",
                                    animation: !isComplete ? "quest-border-pulse 3s ease-in-out infinite" : "none",
                                  }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                  <div className="text-4xl filter grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-500 relative z-10">{q.icon}</div>
                                  <div className="flex-1 min-w-0 relative z-10">
                                    <div className="flex justify-between items-end mb-2">
                                      <span className="system-readout text-[11px] font-black uppercase tracking-wide" style={{ color: isComplete ? "#06B6D4" : "#E2E8F0" }}>
                                        {isComplete ? "✓ " : ""}{q.name}
                                      </span>
                                      <span className="system-readout text-[10px] font-black tabular-nums" style={{ color: isComplete ? "#06B6D4" : "#A855F7" }}>
                                        {q.current || 0}/{q.target}
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full"
                                        style={{
                                          background: isComplete
                                            ? "linear-gradient(90deg, #06B6D4, #38BDF8)"
                                            : `linear-gradient(90deg, #7C3AED, #06B6D4)`,
                                          boxShadow: isComplete ? "0 0 10px rgba(6,182,212,0.6)" : "0 0 8px rgba(124,58,237,0.5)",
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                         </div>
                      </div>
                      <ErrorBoundary><BossEvent state={state} dispatch={dispatch} onChapterUnlocked={handleChapterUnlocked} /></ErrorBoundary>
                   </div>
                   <div className="space-y-12">
                      <div className="system-panel p-10 border-[#06B6D4]/30 bg-[#030308]/60 backdrop-blur-3xl shadow-2xl">
                         <h2 className="text-[12px] font-black text-[#06B6D4] mb-10 system-readout tracking-[0.5em] uppercase italic">SYSTEM_LOGS</h2>
                         <div className="space-y-5">
                            {chapters?.slice(0, 5).map((ch: any) => (
                              <div
                                key={ch.id}
                                onClick={() => {
                                  if (!ch.unlocked) return;
                                  const validUrl = ch.externalUrl?.includes("comix.to") ? ch.externalUrl : null;
                                  if (validUrl) {
                                    window.open(validUrl, "_blank");
                                  } else {
                                    dispatch({
                                      type: "ADD_NOTIFICATION",
                                      payload: {
                                        type: "INFO",
                                        title: "SOURCE NOT YET AVAILABLE",
                                        body: "This chapter has been unlocked but the source URL is not confirmed. Check back soon.",
                                        icon: "📖",
                                      },
                                    });
                                  }
                                }}
                                className={cn(
                                  "p-5 rounded-2xl border flex items-center justify-between transition-all",
                                  ch.unlocked
                                    ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer"
                                    : "border-white/5 opacity-20 grayscale pointer-events-none"
                                )}
                              >
                                 <div className="flex items-center gap-5">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[11px] font-black text-[#94A3B8] border border-white/5 uppercase">{ch.id}</div>
                                    <div>
                                       <div className="system-readout text-[12px] font-black text-white uppercase">{ch.title}</div>
                                       <div className="system-readout text-[8px] text-[#94A3B8] font-bold uppercase tracking-widest mt-1">
                                         {ch.unlocked ? (ch.externalUrl?.includes("comix.to") ? "VERIFIED_LOG" : "SOURCE NOT YET AVAILABLE") : "LOCKED"}
                                       </div>
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
                <ErrorBoundary><ShadowArmy
                  userId={user.id}
                  shadows={shadows}
                  stats={stats}
                  extractionTokens={extractionTokens}
                  dispatch={dispatch}
                  onExtractionChange={async () => {
                    // Re-derive stats from raw base to prevent double shadow application
                    // state.user.stats = raw base stored at login (pre-item, pre-shadow)
                    // state.stats = current active stats (already has item + shadow multipliers)
                    // We must start from state.user.stats, not state.stats
                    try {
                      const { getUserInventory } = await import("@/lib/services/inventoryService");
                      const { getUserShadows } = await import("@/lib/services/shadowService");
                      const { calculateModifiedStats } = await import("@/lib/game/shadowSystem");
                      const STAT_KEYS = ["strength","vitality","agility","intelligence","perception","sense"] as const;

                      const [invItems, shadowRows] = await Promise.all([
                        getUserInventory(user.id).catch(() => []),
                        getUserShadows(user.id).catch(() => []),
                      ]);

                      // Step 1: item bonuses on raw base
                      const rawBase = state.user.stats;
                      const bonuses: Record<string, number> = {};
                      for (const invItem of invItems) {
                        if (!invItem.equipped || !invItem.items?.effects) continue;
                        for (const [key, val] of Object.entries(invItem.items.effects)) {
                          if (STAT_KEYS.includes(key as any) && typeof val === "number") {
                            bonuses[key] = (bonuses[key] ?? 0) + val;
                          }
                        }
                      }
                      const itemBoosted = rawBase ? {
                        ...rawBase,
                        strength:     (rawBase.strength     ?? 10) + (bonuses.strength     ?? 0),
                        vitality:     (rawBase.vitality     ?? 10) + (bonuses.vitality     ?? 0),
                        agility:      (rawBase.agility      ?? 10) + (bonuses.agility      ?? 0),
                        intelligence: (rawBase.intelligence ?? 10) + (bonuses.intelligence ?? 0),
                        perception:   (rawBase.perception   ?? 10) + (bonuses.perception   ?? 0),
                        sense:        (rawBase.sense        ?? 10) + (bonuses.sense        ?? 0),
                      } : rawBase;

                      // Step 2: shadow multipliers on item-boosted base
                      const newShadowIds = shadowRows.map(s => s.shadow_id);
                      const stateForCalc = { ...state, stats: itemBoosted, shadows: newShadowIds };
                      const finalStats = calculateModifiedStats(stateForCalc);

                      dispatch({ type: "SET_DATA", payload: { stats: finalStats, shadows: newShadowIds } });

                      // Step 3: update token count display
                      const { supabase } = await import("@/lib/supabase");
                      const { data } = await supabase
                        .from("users")
                        .select("extraction_tokens")
                        .eq("id", user.id)
                        .maybeSingle();
                      if (data?.extraction_tokens !== undefined) {
                        setExtractionTokens(data.extraction_tokens ?? 0);
                      }
                    } catch (err) {
                      console.error("[Dashboard] onExtractionChange error:", err);
                    }
                  }}
                /></ErrorBoundary>
              </motion.div>
            )}

            {activeTab === "STORAGE" && (
              <motion.div key="inv" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-7xl mx-auto">
                <ErrorBoundary><Inventory
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
                /></ErrorBoundary>
              </motion.div>
            )}

            {activeTab === "GATES" && (
              <motion.div key="gates" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-w-7xl mx-auto">
                <ErrorBoundary><DungeonGate isOpen={true} onEnter={() => setShowWorkout(true)} /></ErrorBoundary>
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
                  <ErrorBoundary><Arena state={state} dispatch={dispatch} onClose={() => setActiveTab("STATUS")} /></ErrorBoundary>
                )}
              </motion.div>
            )}
            {activeTab === "GUILD" && (
              <motion.div key="guild" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-4xl mx-auto">
                <ErrorBoundary><GuildHall state={state} /></ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showProfile && (
          <ErrorBoundary>
            <Profile
              state={state}
              onClose={() => setShowProfile(false)}
              onTrialStart={() => { setShowProfile(false); setShowTrial(true); }}
            />
          </ErrorBoundary>
        )}
        {showQuestBoard && <ErrorBoundary><QuestBoard state={state} dispatch={dispatch} onClose={() => setShowQuestBoard(false)} /></ErrorBoundary>}
        {showWorkout && (
          <ErrorBoundary>
            <WorkoutEngine
              state={state}
              dispatch={dispatch}
              onClose={() => setShowWorkout(false)}
              onChapterUnlocked={handleChapterUnlocked}
            />
          </ErrorBoundary>
        )}
        {showTrial && (
          <ErrorBoundary>
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
          </ErrorBoundary>
        )}
        {showRankUp && rankUpResult && (
          <ErrorBoundary>
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
          </ErrorBoundary>
        )}
        {showChapterUnlock && chapterUnlockData && (
          <ErrorBoundary>
            <ChapterUnlockCeremony
              chapterTitle={chapterUnlockData.title}
              chapterNumber={chapterUnlockData.number}
              externalUrl={chapterUnlockData.externalUrl}
              dispatch={dispatch}
              onDismiss={() => {
                setShowChapterUnlock(false);
                setChapterUnlockData(null);
              }}
            />
          </ErrorBoundary>
        )}
        {showSettings && <ErrorBoundary><Settings state={state} dispatch={dispatch} onClose={() => setShowSettings(false)} /></ErrorBoundary>}
        {showLeaderboard && <ErrorBoundary><Leaderboard state={state} onClose={() => setShowLeaderboard(false)} /></ErrorBoundary>}
        {showAchievements && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed inset-0 z-[200] bg-[#030308] overflow-y-auto"
          >
            <ErrorBoundary><AchievementHall onClose={() => setShowAchievements(false)} completedIds={completedAchievementIds} /></ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="fixed bottom-6 left-6 opacity-10 text-[8px] tracking-[0.4em] pointer-events-none uppercase font-black z-50">ARISE_SYSTEM_V4.0_STABLE</div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-3xl"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: "rgba(8,5,20,0.97)",
          borderTop: "1px solid rgba(124,58,237,0.2)",
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(to right, transparent, rgba(124,58,237,0.5), transparent)" }} />

        {MOBILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as "STATUS" | "SHADOWS" | "STORAGE" | "GATES" | "ARENA");
              systemAudio?.playClick();
            }}
            className="flex-1 flex flex-col items-center py-3 gap-1 transition-all relative"
          >
            {/* Active glow indicator dot above icon */}
            {activeTab === tab.id && (
              <motion.div
                layoutId="mobile-nav-dot"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full"
                style={{ background: "#7C3AED", boxShadow: "0 0 8px rgba(124,58,237,0.8)" }}
              />
            )}
            <span
              style={{
                color: activeTab === tab.id ? "#7C3AED" : "#94A3B8",
                filter: activeTab === tab.id ? "drop-shadow(0 0 8px rgba(124,58,237,0.8))" : "none",
                transition: "all 0.3s ease",
              }}
            >
              {tab.icon}
            </span>
            <span
              className="text-[8px] font-orbitron font-black tracking-widest uppercase"
              style={{ color: activeTab === tab.id ? "#7C3AED" : "#94A3B8" }}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
