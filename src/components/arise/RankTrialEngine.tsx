"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { GameState } from "@/lib/gameReducer";
import { generateDailyQuestTargets, nextRankInfo } from "@/lib/game/xpEngine";
import type { HunterRank } from "@/lib/game/xpEngine";
import { RANK_COLORS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

// ── TYPES ────────────────────────────────────────────────────

interface RankTrialEngineProps {
  state: GameState;
  dispatch: React.Dispatch<any>;
  onClose: () => void;
  onTrialPass: (result: {
    oldRank: string;
    newRank: string;
    xpBonus: number;
    statPoints: number;
  }) => void;
}

type TrialPhase = "intro" | "active" | "failed" | "passed";

// ── XP BONUS LOOKUP ──────────────────────────────────────────

const RANK_ADVANCE_XP: Partial<Record<string, number>> = {
  E: 1_000,
  D: 2_000,
  C: 5_000,
  B: 10_000,
  A: 25_000,
  S: 50_000,
};

// ── HELPERS ──────────────────────────────────────────────────

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── COMPONENT ────────────────────────────────────────────────

export default function RankTrialEngine({
  state,
  dispatch,
  onClose,
  onTrialPass,
}: RankTrialEngineProps) {
  const [trialPhase, setTrialPhase] = useState<TrialPhase>("intro");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseReps, setExerciseReps] = useState<number[]>([0, 0, 0, 0]);
  const [currentReps, setCurrentReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Derive next rank info
  const nextInfo = useMemo(
    () => nextRankInfo(state.user.rank as HunterRank),
    [state.user.rank]
  );
  const nextRank = nextInfo.nextRank as HunterRank | null;
  const nextRankColor =
    nextRank && RANK_COLORS[nextRank] ? RANK_COLORS[nextRank] : "#F59E0B";

  // Build trial targets — 2× daily targets, cardio capped at 10 km
  const trialTargets = useMemo(() => {
    const base = generateDailyQuestTargets(
      state.user.level,
      state.user.jobClass
    );
    return base.map((t, i) => ({
      ...t,
      target: i === 3 ? Math.min(t.target * 2, 10) : t.target * 2,
      unit: i === 3 ? "km" : "reps",
    }));
  }, [state.user.level, state.user.jobClass]);

  // ── TIMER ────────────────────────────────────────────────

  useEffect(() => {
    if (isRunning && trialPhase === "active") {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, trialPhase]);

  // ── HANDLERS ─────────────────────────────────────────────

  const handleExerciseComplete = () => {
    const next = exerciseIndex + 1;
    if (next >= 4) {
      setTrialPhase("passed");
      setIsRunning(false);
      handleTrialPass();
    } else {
      setExerciseIndex(next);
      setCurrentReps(0);
    }
  };

  const handleRepIncrement = () => {
    if (!isRunning || trialPhase !== "active") return;
    const target = trialTargets[exerciseIndex].target;
    const newReps = currentReps + 1;
    setCurrentReps(newReps);
    const updated = [...exerciseReps];
    updated[exerciseIndex] = newReps;
    setExerciseReps(updated);
    if (newReps >= target) {
      handleExerciseComplete();
    }
  };

  const handleTrialPass = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch("/api/rank/advance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ trialPassed: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const xpBonus = RANK_ADVANCE_XP[state.user.rank] ?? 1_000;
        // Update client state with new rank from server response
        dispatch({ type: "SET_USER", payload: { rank: data.newRank } });
        onTrialPass({
          oldRank: state.user.rank,
          newRank: data.newRank,
          xpBonus: data.xpBonus ?? xpBonus,
          statPoints: 5,
        });
      } else {
        // Server rejected — treat as failure
        handleTrialFail();
      }
    } catch {
      handleTrialFail();
    }
  };

  const handleTrialFail = async () => {
    setTrialPhase("failed");
    setIsRunning(false);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      // Record failure timestamp — POST with trialPassed: false
      await fetch("/api/rank/advance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ trialPassed: false }),
      });
    }
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "SYSTEM",
        title: "TRIAL FAILED",
        body: "Trial failed. Cooldown: 24h.",
        icon: "❌",
      },
    });
  };

  // ── RENDER ───────────────────────────────────────────────

  const activeTarget = trialTargets[exerciseIndex];
  const progress =
    activeTarget && activeTarget.target > 0
      ? Math.min(1, currentReps / activeTarget.target)
      : 0;

  const cooldownDate = new Date(Date.now() + 24 * 3600 * 1000).toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-[#030308] overflow-y-auto flex flex-col"
    >
      {/* ── HEADER ── */}
      <div
        className="relative px-6 pt-10 pb-8 shrink-0"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(217,119,6,0.12), transparent 60%)",
        }}
      >
        {/* Abandon button */}
        <button
          aria-label="Abandon Trial"
          onClick={() => setShowAbandonConfirm(true)}
          className="absolute top-6 right-6 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#EF4444] hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <span className="font-orbitron text-[12px] font-black text-[#F59E0B] tracking-[0.4em] uppercase border border-[#F59E0B]/40 px-4 py-1">
            RANK TRIAL ACTIVE
          </span>
          {nextRank && (
            <div
              className="font-orbitron text-[20px] font-black"
              style={{ color: nextRankColor }}
            >
              TARGET: RANK {nextRank}
            </div>
          )}
          <p className="text-[14px] text-[#94A3B8]">
            Complete all 4 exercises at 2&times; your current targets.
          </p>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 px-6 pb-10 space-y-4 max-w-lg mx-auto w-full">

        {/* Exercise cards */}
        <div className="space-y-3">
          {trialTargets.map((ex, i) => {
            const isActive = trialPhase === "active" && i === exerciseIndex;
            const isDone =
              trialPhase === "passed" ||
              (trialPhase === "active" && i < exerciseIndex) ||
              exerciseReps[i] >= ex.target;
            const repCount = i === exerciseIndex ? currentReps : exerciseReps[i];
            const barPct =
              ex.target > 0 ? Math.min(100, (repCount / ex.target) * 100) : 0;

            return (
              <div
                key={ex.type}
                className={`system-panel p-4 ${
                  isDone
                    ? "border-[rgba(34,197,94,0.4)]"
                    : isActive
                    ? "border-[#7C3AED] animate-system-pulse"
                    : "border-[#7C3AED]/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ex.icon}</span>
                    <span className="font-orbitron text-[13px] font-black text-[#E2E8F0] uppercase tracking-widest">
                      {ex.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-[#F59E0B]">
                      {ex.target} {ex.unit}
                    </span>
                    {isDone && (
                      <CheckCircle2 size={18} color="#22c55e" />
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D97706] rounded-full transition-all"
                    style={{ width: `${barPct}%` }}
                  />
                </div>

                {/* Active rep counter */}
                {isActive && (
                  <div className="mt-4 flex flex-col items-center gap-3">
                    <div className="font-orbitron text-[28px] font-black">
                      <span className="text-white">{currentReps}</span>
                      <span className="text-[#94A3B8] mx-1">/</span>
                      <span className="text-[#F59E0B]">{ex.target}</span>
                    </div>
                    <div className="font-mono text-[14px] text-[#94A3B8]">
                      {formatTime(seconds)}
                    </div>
                    <button
                      onClick={handleRepIncrement}
                      disabled={!isRunning}
                      className="min-h-[44px] px-8 border border-[#7C3AED] text-[#A855F7] font-orbitron text-[12px] font-black tracking-widest uppercase hover:bg-[#7C3AED]/10 transition-all disabled:opacity-40"
                    >
                      +1 REP
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── INTRO PHASE: Begin button ── */}
        {trialPhase === "intro" && (
          <button
            onClick={() => {
              setTrialPhase("active");
              setIsRunning(true);
            }}
            className="w-full min-h-[44px] font-orbitron text-[13px] font-black tracking-[0.3em] uppercase transition-all border"
            style={{
              borderColor: "#D97706",
              color: "#D97706",
            }}
          >
            BEGIN TRIAL
          </button>
        )}

        {/* ── FAILED PHASE ── */}
        {trialPhase === "failed" && (
          <div
            className="p-8 flex flex-col items-center gap-4 text-center"
            style={{ background: "rgba(220,38,38,0.06)" }}
          >
            <div className="font-orbitron text-[28px] font-black text-[#EF4444]">
              TRIAL FAILED
            </div>
            <p className="text-[14px] text-[#94A3B8]">
              Return in 24 hours, Hunter.
            </p>
            <p className="font-mono text-[12px] text-[#EF4444]">
              Available: {cooldownDate}
            </p>
            <button
              onClick={onClose}
              className="min-h-[44px] px-8 border border-[#7C3AED] text-[#A855F7] font-orbitron text-[12px] font-black tracking-widest uppercase hover:bg-[#7C3AED]/10 transition-all"
            >
              RETURN TO BASE
            </button>
          </div>
        )}
      </div>

      {/* ── ABANDON CONFIRMATION OVERLAY ── */}
      {showAbandonConfirm && (
        <div className="absolute inset-0 z-[300] bg-black/80 flex items-center justify-center">
          <div className="system-panel border-[#7C3AED]/40 p-8 max-w-sm mx-6 flex flex-col gap-6">
            <p className="text-[14px] text-[#94A3B8] text-center">
              Abandon trial? Progress will be lost.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  handleTrialFail();
                  setShowAbandonConfirm(false);
                  onClose();
                }}
                className="min-h-[44px] border border-[#EF4444] text-[#EF4444] font-orbitron text-[12px] font-black tracking-widest uppercase hover:bg-[#EF4444]/10 transition-all"
              >
                CONFIRM ABANDON
              </button>
              <button
                onClick={() => setShowAbandonConfirm(false)}
                className="min-h-[44px] border border-[#7C3AED] text-[#A855F7] font-orbitron text-[12px] font-black tracking-widest uppercase hover:bg-[#7C3AED]/10 transition-all"
              >
                CONTINUE TRIAL
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
