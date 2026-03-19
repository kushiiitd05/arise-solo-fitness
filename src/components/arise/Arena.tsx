"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, User, ShieldAlert, Trophy, History, BarChart3, ChevronRight } from "lucide-react";
import { GameState } from "@/lib/gameReducer";
import { RANK_COLORS, RANK_LABELS } from "@/lib/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateArenaOpponent } from '@/lib/ai/prompts/arenaPrompt';
import { aiCache } from '@/lib/ai/sessionCache';
import { TypingText } from '@/components/system/TypingText';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type MatchStatus = "idle" | "searching" | "found" | "performing" | "resolving" | "result";
type ArenaTab = "MATCHMAKING" | "HISTORY" | "RANKINGS";
type Exercise = "PUSH-UPS" | "SQUATS" | "SIT-UPS" | "PLANKS";

const OPPONENT_NAMES = ["IRON SHADOW", "VOID WALKER", "CRIMSON TIDE", "STEEL PHANTOM", "DARK SOVEREIGN", "ABYSS KNIGHT", "VOID HERALD"];
const OPPONENT_RANKS = ["D", "C", "B", "A"] as const;


const MOCK_RANKINGS = [
  { pos: 1,  name: "SHADOW MONARCH",   rank: "S", rating: 2840, wins: 142, losses: 8  },
  { pos: 2,  name: "VOID EMPEROR",     rank: "S", rating: 2610, wins: 118, losses: 22 },
  { pos: 3,  name: "IRON COLOSSUS",    rank: "A", rating: 2340, wins: 97,  losses: 31 },
  { pos: 4,  name: "CRIMSON TIDE",     rank: "A", rating: 2180, wins: 84,  losses: 40 },
  { pos: 5,  name: "ABYSS KNIGHT",     rank: "B", rating: 1980, wins: 71,  losses: 44 },
  { pos: 6,  name: "STEEL PHANTOM",    rank: "B", rating: 1750, wins: 62,  losses: 49 },
  { pos: 7,  name: "YOU",              rank: "C", rating: 0,    wins: 0,   losses: 0, isPlayer: true },
  { pos: 8,  name: "DARK SOVEREIGN",   rank: "C", rating: 1320, wins: 44,  losses: 58 },
  { pos: 9,  name: "VOID WALKER",      rank: "D", rating: 1100, wins: 31,  losses: 67 },
  { pos: 10, name: "IRON SHADOW",      rank: "D", rating: 950,  wins: 20,  losses: 78 },
];

const OUTCOME_STYLES = {
  WIN:  { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", label: "WIN"  },
  LOSS: { bg: "bg-red-500/10 border-red-500/30",         text: "text-red-400",     label: "LOSS" },
  DRAW: { bg: "bg-amber-500/10 border-amber-500/30",     text: "text-amber-400",   label: "DRAW" },
};

interface ArenaProps {
  state: GameState;
  dispatch: React.Dispatch<any>;
  onClose: () => void;
}

export default function Arena({ state, dispatch, onClose }: ArenaProps) {
  const [activeTab, setActiveTab] = useState<ArenaTab>("MATCHMAKING");
  const [matchStatus, setMatchStatus] = useState<MatchStatus>("idle");
  const [selectedExercise, setSelectedExercise] = useState<Exercise>("PUSH-UPS");
  const [opponent, setOpponent] = useState<{ name: string; rank: string; rating: number } | null>(null);
  const [repsInput, setRepsInput] = useState<string>("");
  const [battleResult, setBattleResult] = useState<{
    outcome: "WIN" | "LOSS" | "DRAW";
    xpChange: number;
    ratingChange: number;
    newRating: number;
    opponentName: string;
    opponentRank: string;
  } | null>(null);
  const [battleHistory, setBattleHistory] = useState<Array<{
    id: string;
    opponent_name: string;
    opponent_rank: string;
    exercise: string;
    outcome: "WIN" | "LOSS" | "DRAW";
    xp_change: number;
    rating_change: number;
    reps_submitted: number | null;
    created_at: string;
  }>>([]);

  const [opponentTaunt, setOpponentTaunt] = useState<string | null>(null);
  const [battleStartedAt, setBattleStartedAt] = useState<number | null>(null);

  const pvpRating = state.stats?.pvpRating || 1200;
  const pvpWins   = state.stats?.pvpWins   || 0;
  const pvpLosses = state.stats?.pvpLosses || 0;
  const totalBattles = pvpWins + pvpLosses;
  const winRate = totalBattles > 0 ? Math.round((pvpWins / totalBattles) * 100) : 0;

  // Opponent search — races AI generation against 2500ms fallback timer
  useEffect(() => {
    if (matchStatus !== "searching") return;

    const rank   = OPPONENT_RANKS[Math.floor(Math.random() * OPPONENT_RANKS.length)];
    const rating = Math.floor(Math.random() * 500) + 950;
    const startedAt = Date.now();
    setBattleStartedAt(startedAt);

    const cacheKey = `arena:${startedAt}`;

    // Race: AI generation vs 2500ms fallback timer
    // Whichever resolves first sets the opponent name
    let settled = false;

    const fallbackTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // Fallback: use OPPONENT_NAMES array (keep unchanged for reliability)
      const fallbackName = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
      setOpponent({ name: fallbackName, rank, rating });
      setOpponentTaunt(null);
      setMatchStatus("found");
    }, 2500);

    generateArenaOpponent(state.user.rank ?? 'E').then((aiOpponent) => {
      if (settled) return; // fallback already fired — discard late AI response
      if (aiOpponent) {
        settled = true;
        clearTimeout(fallbackTimer);
        aiCache.set(cacheKey, JSON.stringify(aiOpponent));
        setOpponent({ name: aiOpponent.name, rank, rating });
        setOpponentTaunt(aiOpponent.taunt);
        setMatchStatus("found");
      }
      // null = AI failed but fallbackTimer is still running — let it fire naturally
    });

    return () => {
      clearTimeout(fallbackTimer);
      settled = true; // prevent state updates after unmount
    };
  }, [matchStatus]); // state.user.rank intentionally omitted — rank stable within a session

  // Fetch battle history when HISTORY tab is activated
  useEffect(() => {
    if (activeTab !== "HISTORY") return;
    const userId = state.user.id;
    if (!userId) return;
    fetch("/api/arena/history", {
      headers: { "Authorization": `Bearer ${userId}` },
    })
      .then(r => r.json())
      .then(d => setBattleHistory(d.battles ?? []))
      .catch(err => console.error("[Arena] History fetch failed:", err));
  }, [activeTab, state.user.id]);

  const handleAccept = () => {
    setRepsInput("");
    setMatchStatus("performing");
  };

  const handleBattleSubmit = async () => {
    if (!opponent) return;
    const reps = parseInt(repsInput, 10);
    if (isNaN(reps) || reps < 0) return;

    setMatchStatus("resolving");
    const userId = state.user.id;

    try {
      const res = await fetch("/api/arena/battle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
        },
        body: JSON.stringify({
          exercise: selectedExercise,
          opponentName: opponent.name,
          opponentRank: opponent.rank,
          repsSubmitted: reps,
        }),
      });

      if (!res.ok) throw new Error("Battle API failed");
      const data = await res.json();
      setBattleResult(data);
      setMatchStatus("result");

      // Push newRating into live game state immediately so the player card
      // reflects the post-battle rating without requiring a page reload.
      // pvpWins / pvpLosses are not returned by the API — they will be
      // accurate after the next session load from the server.
      dispatch({
        type: "SET_DATA",
        payload: {
          stats: { pvpRating: data.newRating },
        },
      });

      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          type: "PVP",
          title:
            data.outcome === "WIN"
              ? `BATTLE WON: +${data.xpChange} XP`
              : data.outcome === "DRAW"
              ? `DRAW: +${data.xpChange} XP`
              : "BATTLE LOST",
          body: `vs ${data.opponentName}`,
          icon: "⚔️",
        },
      });

      // Refresh history so HISTORY tab is up-to-date after battle
      const histRes = await fetch("/api/arena/history", {
        headers: { "Authorization": `Bearer ${userId}` },
      });
      if (histRes.ok) {
        const histData = await histRes.json();
        setBattleHistory(histData.battles ?? []);
      }
    } catch (err) {
      console.error("[Arena] Battle submission failed:", err);
      setMatchStatus("found"); // fall back to found so player can retry
    }
  };

  const EXERCISES: Exercise[] = ["PUSH-UPS", "SQUATS", "SIT-UPS", "PLANKS"];
  const TABS: { id: ArenaTab; label: string; Icon: React.ElementType }[] = [
    { id: "MATCHMAKING", label: "MATCHMAKING", Icon: Swords   },
    { id: "HISTORY",     label: "HISTORY",     Icon: History  },
    { id: "RANKINGS",    label: "RANKINGS",    Icon: BarChart3},
  ];

  // Inject player rating into rankings
  const rankings = MOCK_RANKINGS.map(r =>
    r.isPlayer ? { ...r, rating: pvpRating, wins: pvpWins, losses: pvpLosses } : r
  );

  return (
    <div className="min-h-full bg-[#030308] font-exo p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
            <span className="text-[10px] font-share-tech-mono text-red-500 tracking-[0.4em] uppercase">
              HUNTER ARENA
            </span>
          </div>
          <h1 className="text-2xl font-orbitron font-black text-white tracking-widest uppercase flex items-center gap-3">
            <Swords size={22} className="text-red-500" /> ARENA
          </h1>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors p-1 text-lg">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/5 pb-0">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-orbitron font-black tracking-widest uppercase border-b-2 -mb-px transition-all",
              activeTab === id
                ? "border-red-500 text-red-400"
                : "border-transparent text-slate-600 hover:text-slate-400"
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">

        {/* ── MATCHMAKING ── */}
        {activeTab === "MATCHMAKING" && (
          <motion.div key="mm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Player stats card */}
            <div className="p-5 mb-5 border border-red-900/30 rounded bg-red-900/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <User size={26} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-orbitron font-black text-white tracking-wider">
                    {state.user.username || "HUNTER"}
                  </p>
                  <p className="text-[10px] font-share-tech-mono text-red-400 tracking-widest">
                    {state.user.rank || "E"}-RANK · {pvpRating} MMR
                  </p>
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-lg font-orbitron font-black text-emerald-400">{pvpWins}</p>
                  <p className="text-[8px] font-share-tech-mono text-slate-600 tracking-widest">WINS</p>
                </div>
                <div>
                  <p className="text-lg font-orbitron font-black text-red-400">{pvpLosses}</p>
                  <p className="text-[8px] font-share-tech-mono text-slate-600 tracking-widest">LOSSES</p>
                </div>
                <div>
                  <p className="text-lg font-orbitron font-black text-cyan-400">{winRate}%</p>
                  <p className="text-[8px] font-share-tech-mono text-slate-600 tracking-widest">WIN RATE</p>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {matchStatus === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Exercise selector */}
                  <p className="text-[10px] font-share-tech-mono text-slate-500 tracking-[0.3em] uppercase mb-3">
                    Select Battle Exercise
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                    {EXERCISES.map(ex => (
                      <button
                        key={ex}
                        onClick={() => setSelectedExercise(ex)}
                        className={cn(
                          "py-3 px-4 rounded border text-[10px] font-orbitron font-black tracking-widest uppercase transition-all",
                          selectedExercise === ex
                            ? "border-red-500/60 bg-red-500/15 text-red-400 shadow-[0_0_12px_rgba(220,38,38,0.15)]"
                            : "border-white/8 bg-white/[0.03] text-slate-500 hover:text-slate-300 hover:border-white/15"
                        )}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setMatchStatus("searching")}
                    className="w-full py-4 font-orbitron font-black tracking-[0.4em] text-sm uppercase rounded border border-red-600/50 bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:border-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.1)] hover:shadow-[0_0_30px_rgba(220,38,38,0.2)]"
                  >
                    ⚔ Find Opponent
                  </button>
                </motion.div>
              )}

              {matchStatus === "searching" && (
                <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-16 gap-8">
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-red-500/40"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
                      className="absolute inset-0 rounded-full border border-red-400/20"
                    />
                    <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                      <Swords size={28} className="text-red-400" />
                    </div>
                  </div>
                  <p className="text-sm font-orbitron font-black text-red-400 tracking-[0.3em] uppercase animate-pulse">
                    Scanning Hunter Database...
                  </p>
                  <button
                    onClick={() => setMatchStatus("idle")}
                    className="text-[10px] font-share-tech-mono text-slate-600 hover:text-slate-400 tracking-widest uppercase transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}

              {matchStatus === "found" && opponent && (
                <motion.div key="found" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className="p-6 border border-amber-500/30 rounded bg-amber-500/5 mb-4">
                    <p className="text-[10px] font-share-tech-mono text-amber-400 tracking-[0.3em] uppercase text-center mb-5">
                      Opponent Found
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      {/* Player */}
                      <div className="flex-1 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center mx-auto mb-2">
                          <User size={28} className="text-red-400" />
                        </div>
                        <p className="text-xs font-orbitron font-black text-white tracking-wider">YOU</p>
                        <p className="text-[9px] font-share-tech-mono text-red-400">{pvpRating} MMR</p>
                      </div>

                      <div className="text-2xl font-orbitron font-black text-white/20">VS</div>

                      {/* Opponent */}
                      <div className="flex-1 text-center">
                        <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center mx-auto mb-2">
                          <User size={28} className="text-purple-400" />
                        </div>
                        <p className="text-xs font-orbitron font-black text-white tracking-wider truncate">{opponent.name}</p>
                        <p className="text-[9px] font-share-tech-mono" style={{ color: RANK_COLORS[opponent.rank as keyof typeof RANK_COLORS] || "#a855f7" }}>
                          {opponent.rank}-RANK · {opponent.rating} MMR
                        </p>
                      </div>
                    </div>

                    <p className="text-center text-[10px] font-share-tech-mono text-slate-500 mt-4 tracking-widest">
                      Exercise: <span className="text-white">{selectedExercise}</span>
                    </p>

                    {/* AI opponent taunt — additive, renders only when Ollama provided a taunt */}
                    {opponentTaunt && matchStatus === "found" && (
                      <p className="text-[10px] font-mono text-amber-400/80 italic mt-2 text-center">
                        <TypingText text={`"${opponentTaunt}"`} speedMs={20} />
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAccept}
                      className="flex-1 py-3.5 bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 font-orbitron font-black text-xs tracking-[0.3em] uppercase rounded hover:bg-emerald-600/30 transition-all"
                    >
                      ✓ Accept Battle
                    </button>
                    <button
                      onClick={() => { setMatchStatus("idle"); setOpponent(null); }}
                      className="flex-1 py-3.5 bg-white/[0.03] border border-white/8 text-slate-500 font-orbitron font-black text-xs tracking-[0.3em] uppercase rounded hover:text-slate-300 transition-all"
                    >
                      ✕ Decline
                    </button>
                  </div>
                </motion.div>
              )}

              {matchStatus === "performing" && opponent && (
                <motion.div key="performing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className="p-6 border border-cyan-500/30 rounded bg-cyan-500/5 mb-4">
                    <p className="text-[10px] font-share-tech-mono text-cyan-400 tracking-[0.3em] uppercase text-center mb-2">
                      Battle Accepted — Submit Performance
                    </p>
                    <p className="text-center text-xs font-orbitron text-white tracking-wider mb-6">
                      vs <span className="text-purple-300">{opponent.name}</span>
                      {" · "}<span className="text-slate-400">{selectedExercise}</span>
                    </p>
                    <p className="text-[10px] font-share-tech-mono text-slate-500 tracking-[0.25em] uppercase mb-2 text-center">
                      Reps / Seconds Completed
                    </p>
                    <input
                      type="number"
                      min={0}
                      value={repsInput}
                      onChange={e => setRepsInput(e.target.value)}
                      placeholder="Enter reps or seconds..."
                      className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white font-share-tech-mono text-sm text-center focus:outline-none focus:border-cyan-500/50 mb-4"
                    />
                    <button
                      onClick={handleBattleSubmit}
                      disabled={!repsInput || parseInt(repsInput, 10) < 0}
                      className="w-full py-3.5 bg-cyan-600/20 border border-cyan-600/40 text-cyan-400 font-orbitron font-black text-xs tracking-[0.3em] uppercase rounded hover:bg-cyan-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ⚔ Submit Battle
                    </button>
                  </div>
                </motion.div>
              )}

              {matchStatus === "resolving" && (
                <motion.div key="resolving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-16 gap-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 rounded-full border-2 border-t-red-500 border-r-transparent border-b-red-500/30 border-l-transparent"
                  />
                  <p className="text-sm font-orbitron font-black text-red-400 tracking-[0.3em] uppercase animate-pulse">
                    Computing Outcome...
                  </p>
                </motion.div>
              )}

              {matchStatus === "result" && battleResult && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  {(() => {
                    const s = OUTCOME_STYLES[battleResult.outcome];
                    return (
                      <div className={`p-6 border rounded mb-4 text-center ${s.bg}`}>
                        <p className={`text-3xl font-orbitron font-black tracking-[0.4em] mb-2 ${s.text}`}>{s.label}</p>
                        <p className="text-sm font-share-tech-mono text-slate-400 mb-1">vs {battleResult.opponentName}</p>
                        {battleResult.xpChange > 0 && (
                          <p className="text-lg font-orbitron font-black text-emerald-400">+{battleResult.xpChange} XP</p>
                        )}
                        <p className="text-[10px] font-share-tech-mono text-slate-500 mt-1">
                          Rating: {battleResult.newRating} ({battleResult.ratingChange >= 0 ? "+" : ""}{battleResult.ratingChange})
                        </p>
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => { setMatchStatus("idle"); setOpponent(null); setBattleResult(null); setRepsInput(""); }}
                    className="w-full py-3.5 bg-white/[0.03] border border-white/8 text-slate-400 font-orbitron font-black text-xs tracking-[0.3em] uppercase rounded hover:text-white hover:border-white/20 transition-all"
                  >
                    Return to Arena
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Disclaimer */}
            <div className="mt-6 p-4 border border-white/5 rounded flex items-start gap-3 text-slate-600 text-[10px]">
              <ShieldAlert size={14} className="text-slate-600 flex-shrink-0 mt-0.5" />
              <span>Fair-play algorithm active. Camera verification recommended for full ELO rewards. The System monitors all battles.</span>
            </div>
          </motion.div>
        )}

        {/* ── HISTORY ── */}
        {activeTab === "HISTORY" && (
          <motion.div key="hist" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {battleHistory.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-4 text-center">
                <History size={48} className="text-slate-700" />
                <p className="text-sm font-orbitron font-black text-slate-600 tracking-wider">NO BATTLES ON RECORD</p>
                <p className="text-xs text-slate-700">Enter the arena to begin your PvP journey.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {battleHistory.map((battle, i) => {
                  const s = OUTCOME_STYLES[battle.outcome as keyof typeof OUTCOME_STYLES];
                  return (
                    <motion.div
                      key={battle.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={cn("flex items-center justify-between p-4 rounded border", s.bg)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("text-xs font-orbitron font-black tracking-widest w-10", s.text)}>
                          {s.label}
                        </span>
                        <div>
                          <p className="text-xs font-orbitron text-white font-black tracking-wider">{battle.opponent_name}</p>
                          <p className="text-[9px] font-share-tech-mono text-slate-500 tracking-widest">
                            {battle.exercise} · {battle.created_at.slice(0, 10)}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-xs font-orbitron font-black", battle.xp_change > 0 ? "text-emerald-400" : "text-slate-500")}>
                        {battle.xp_change > 0 ? `+${battle.xp_change}` : "0"} XP
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── RANKINGS ── */}
        {activeTab === "RANKINGS" && (
          <motion.div key="rank" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="space-y-1.5">
              {rankings.map((entry, i) => {
                const rankColor = RANK_COLORS[entry.rank as keyof typeof RANK_COLORS] || "#94a3b8";
                const isPlayer  = "isPlayer" in entry && entry.isPlayer;
                return (
                  <motion.div
                    key={entry.pos}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded border transition-all",
                      isPlayer
                        ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.1)]"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10"
                    )}
                  >
                    {/* Position */}
                    <span className={cn(
                      "w-8 text-center font-orbitron font-black text-sm flex-shrink-0",
                      entry.pos <= 3 ? "text-amber-400" : "text-slate-600"
                    )}>
                      {entry.pos <= 3 ? ["🥇","🥈","🥉"][entry.pos - 1] : `#${entry.pos}`}
                    </span>

                    {/* Rank badge */}
                    <span className="w-8 h-8 flex items-center justify-center rounded border text-[10px] font-orbitron font-black flex-shrink-0"
                      style={{ color: rankColor, borderColor: `${rankColor}40`, background: `${rankColor}15` }}>
                      {entry.rank}
                    </span>

                    {/* Name */}
                    <span className={cn("flex-1 text-xs font-orbitron font-black tracking-wider", isPlayer ? "text-purple-300" : "text-white")}>
                      {entry.name} {isPlayer && <span className="text-purple-500 text-[9px]">(YOU)</span>}
                    </span>

                    {/* Stats */}
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-xs font-orbitron font-black text-cyan-400">{entry.rating}</p>
                        <p className="text-[8px] font-share-tech-mono text-slate-600 tracking-widest">MMR</p>
                      </div>
                      <div>
                        <p className="text-xs font-orbitron font-black text-emerald-400">{entry.wins}W</p>
                        <p className="text-[8px] font-share-tech-mono text-slate-600 tracking-widest">WINS</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-700 flex-shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
