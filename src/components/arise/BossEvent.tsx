"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Users, Swords, Shield, Lock, AlertTriangle, X, Trophy, RotateCcw } from "lucide-react";
import { getActiveBoss, subscribeToBossUpdates, dealDamage, awardRaidReward, BOSS_RANK_XP } from "@/lib/services/bossService";
import type { WorldBoss } from "@/lib/services/bossService";
import { BOSS_ROSTER } from "@/lib/data/bossRoster";
import type { GameState } from "@/lib/gameReducer";
import { generateBossBlurb } from '@/lib/ai/prompts/bossPrompt';
import { aiCache } from '@/lib/ai/sessionCache';
import { TypingText } from '@/components/system/TypingText';

interface BossEventProps {
  state: GameState;
  dispatch: React.Dispatch<any>;
  onChapterUnlocked?: (newCount: number) => void;
}

interface FloatingDmg {
  id: number;
  value: number;
  x: number;
}

// ──────────────────── LEVEL GATE ─────────────────────────
function LockedGate({ level }: { level: number }) {
  const progress = Math.min(100, (level / 10) * 100);
  return (
    <div className="glass p-6 rounded-2xl border-red-900/40 bg-red-900/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08),transparent_70%)]" />
      <div className="relative z-10 text-center">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 border-2 border-red-600/50 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)]"
        >
          <Lock size={28} className="text-red-500" />
        </motion.div>
        <div className="text-[10px] font-bold text-red-500 uppercase tracking-[0.4em] mb-1 flex items-center justify-center gap-2">
          <AlertTriangle size={12} /> DUNGEON SEALED
        </div>
        <h3 className="text-lg font-orbitron font-black text-foreground tracking-widest uppercase mb-1">
          WORLD BOSS RAIDS
        </h3>
        <p className="text-[11px] font-mono text-muted-foreground mb-5">
          REACH <span className="text-red-400 font-bold">LEVEL 10</span> TO UNLOCK RAIDS
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>LV {level}</span>
            <span>LV 10 REQUIRED</span>
          </div>
          <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-red-900/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-red-900 to-red-500 rounded-full"
            />
          </div>
          <p className="text-[9px] font-mono text-muted-foreground/50">
            {10 - level} more levels until access is granted
          </p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────── MINI WORKOUT MODAL ──────────────────
function MiniWorkoutModal({ onComplete, onCancel }: { onComplete: (reps: number) => void; onCancel: () => void }) {
  const target = 10;
  const [reps, setReps] = useState(0);
  const [done, setDone] = useState(false);

  // Spacebar support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !done) {
        e.preventDefault();
        setReps(r => {
          const next = r + 1;
          if (next >= target) { setDone(true); setTimeout(() => onComplete(next), 800); }
          return next;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [done, onComplete]);

  const addRep = () => {
    if (done) return;
    setReps(r => {
      const next = r + 1;
      if (next >= target) { setDone(true); setTimeout(() => onComplete(next), 800); }
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm glass border border-red-500/30 rounded-3xl p-8 text-center shadow-[0_0_60px_rgba(239,68,68,0.2)]"
      >
        <div className="text-[10px] font-orbitron text-red-400 uppercase tracking-[0.4em] mb-2">RAID ACTIVATION</div>
        <h3 className="text-xl font-orbitron font-black text-foreground mb-1">POWER CHARGE</h3>
        <p className="text-[11px] font-mono text-muted-foreground mb-6">Complete {target} push-ups to deal damage</p>

        <div className="relative w-36 h-36 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(239,68,68,0.1)" strokeWidth="6" />
            <motion.circle
              cx="60" cy="60" r="54" fill="none"
              stroke="#ef4444" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={339.3}
              strokeDashoffset={339.3 * (1 - reps / target)}
              transition={{ duration: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span key={reps} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-orbitron font-black text-foreground">{reps}</motion.span>
            <span className="text-[9px] font-mono text-muted-foreground">/ {target} REPS</span>
          </div>
        </div>

        {done ? (
          <div className="text-primary font-orbitron font-black text-sm tracking-widest animate-pulse">
            POWER CHARGED ⚡
          </div>
        ) : (
          <>
            <button onClick={addRep}
              className="w-full py-5 rounded-2xl font-orbitron font-black text-sm tracking-[0.3em] uppercase bg-red-600 hover:bg-red-500 text-white transition-all active:scale-95 shadow-[0_6px_30px_rgba(239,68,68,0.5)] mb-3"
            >
              + REP (SPACE)
            </button>
            <button onClick={onCancel} className="text-[10px] font-mono text-muted-foreground hover:text-white transition-colors">
              Cancel
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ──────────────────── MAIN COMPONENT ─────────────────────
export default function BossEvent({ state, dispatch, onChapterUnlocked }: BossEventProps) {
  const [boss, setBoss] = useState<WorldBoss | null>(null);
  const [timeStr, setTimeStr] = useState("");
  const [floatingDmgs, setFloatingDmgs] = useState<FloatingDmg[]>([]);
  const [showMiniWorkout, setShowMiniWorkout] = useState(false);
  const [showRetreatModal, setShowRetreatModal] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [raidXp, setRaidXp] = useState(500);
  const [isAttacking, setIsAttacking] = useState(false);
  const [hpShake, setHpShake] = useState(false);
  const [aiBlurb, setAiBlurb] = useState<string | null>(null);

  const userLevel = state?.user?.level || 1;
  const userId = state?.user?.id || "";

  // Load & subscribe to boss
  useEffect(() => {
    let sub: any;
    getActiveBoss().then((activeBoss) => {
      if (!activeBoss) return;
      setBoss(activeBoss);
      sub = subscribeToBossUpdates(activeBoss.id, (payload) => {
        setBoss((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, ...payload };
          if ((payload.current_hp ?? prev.current_hp) <= 0 && !showVictory) {
            setShowVictory(true);
          }
          return updated;
        });
      });
    });
    return () => { if (sub?.unsubscribe) sub.unsubscribe(); };
  }, [showVictory]);

  // Countdown timer
  useEffect(() => {
    if (!boss) return;
    const tick = () => {
      const diff = new Date(boss.expires_at).getTime() - Date.now();
      if (diff <= 0) { setTimeStr("EXPIRED"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeStr(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [boss]);

  // AI personality blurb — fires once when boss loads, cached per boss.id
  useEffect(() => {
    if (!boss) return;
    const bossTemplate = BOSS_ROSTER.find(b => b.name === boss.name);
    const bossRank = bossTemplate?.rank ?? 'S';
    const playerRank = state?.user?.rank ?? 'E';
    const cacheKey = `boss:${boss.id}`;

    if (aiCache.has(cacheKey)) {
      setAiBlurb(aiCache.get(cacheKey));
      return;
    }

    generateBossBlurb(boss.name, bossRank, playerRank).then((blurb) => {
      if (blurb) {
        aiCache.set(cacheKey, blurb);
        setAiBlurb(blurb);
      }
      // null = Ollama unavailable — aiBlurb stays null, nothing renders
    });
  }, [boss?.id]); // dep: boss.id only — stable, prevents re-fire on HP updates

  const spawnFloatingDmg = (dmg: number) => {
    const id = Date.now();
    const x = 30 + Math.random() * 40;
    setFloatingDmgs(prev => [...prev, { id, value: dmg, x }]);
    setTimeout(() => setFloatingDmgs(prev => prev.filter(d => d.id !== id)), 1500);
  };

  const handleAttackComplete = useCallback(async (reps: number) => {
    setShowMiniWorkout(false);
    if (!boss || !userId) return;
    setIsAttacking(true);
    const damage = Math.floor(reps * 50 * (1 + userLevel * 0.05));
    const result = await dealDamage(boss.id, userId, damage);
    spawnFloatingDmg(result.damageDealt);
    setHpShake(true);
    setTimeout(() => setHpShake(false), 600);
    if (result.bossDefeated) {
      const bossTemplate = BOSS_ROSTER.find(b => b.name === boss.name);
      const xpForKill = BOSS_RANK_XP[bossTemplate?.rank ?? ""] ?? 500;
      setRaidXp(xpForKill);
      setShowVictory(true);
      const rewardResult = await awardRaidReward(userId, xpForKill);
      if (rewardResult?.chapter_newly_unlocked && onChapterUnlocked) {
        onChapterUnlocked(rewardResult.chapters_unlocked);
      }
      dispatch({
        type: "ADD_NOTIFICATION",
        payload: {
          type: "LEVELUP",
          title: "BOSS DEFEATED",
          body: `${boss.name} has fallen. +${xpForKill.toLocaleString()} XP awarded.`,
          icon: "🏆",
        }
      });
    }
    setIsAttacking(false);
  }, [boss, userId, userLevel, dispatch, onChapterUnlocked]);

  const handleRetreat = () => {
    setShowRetreatModal(false);
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: { type: "INFO", title: "🚪 RETREATED", body: "You have retreated from the raid. Your contribution was recorded.", icon: "💨" }
    });
  };

  if (!boss) return null;
  if (userLevel < 10) return <LockedGate level={userLevel} />;

  const hpPct = Math.max(0, Math.min(100, (boss.current_hp / boss.max_hp) * 100));
  const hpColor = hpPct > 50 ? "from-red-600 to-orange-500" : hpPct > 25 ? "from-red-700 to-red-500" : "from-red-900 to-red-700";

  return (
    <>
      {/* Mini workout modal */}
      <AnimatePresence>
        {showMiniWorkout && (
          <MiniWorkoutModal onComplete={handleAttackComplete} onCancel={() => setShowMiniWorkout(false)} />
        )}
      </AnimatePresence>

      {/* Retreat confirmation */}
      <AnimatePresence>
        {showRetreatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center">
              <Shield size={36} className="mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-orbitron font-black text-lg text-foreground mb-2">RETREAT?</h3>
              <p className="text-xs font-mono text-muted-foreground mb-6">
                RETREATING FROM BATTLE — YOUR CONTRIBUTION WILL BE RECORDED
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowRetreatModal(false)}
                  className="flex-1 py-3 rounded-xl font-orbitron font-black text-xs border border-white/10 text-muted-foreground hover:text-white transition-colors">
                  STAY
                </button>
                <button onClick={handleRetreat}
                  className="flex-1 py-3 rounded-xl font-orbitron font-black text-xs bg-red-900/50 border border-red-800/50 text-red-400 hover:bg-red-900/80 transition-colors">
                  RETREAT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory screen */}
      <AnimatePresence>
        {showVictory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/95 backdrop-blur-xl flex items-center justify-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }} className="text-center p-8">
              <motion.div animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 3 }} className="text-8xl mb-6">🏆</motion.div>
              <h2 className="text-3xl font-orbitron font-black text-yellow-400 mb-2 tracking-widest uppercase drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]">
                BOSS DEFEATED
              </h2>
              <p className="font-orbitron text-lg text-foreground mb-1">{boss.name}</p>
              <p className="text-[11px] font-mono text-muted-foreground mb-6">ALL PARTICIPANTS REWARDED</p>
              <div className="glass border border-yellow-400/30 rounded-2xl px-8 py-4 mb-8 inline-block bg-yellow-400/5">
                <div className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest mb-1">RAID REWARD</div>
                <div className="text-3xl font-orbitron font-black text-yellow-400">+{raidXp.toLocaleString()} XP</div>
              </div>
              <br />
              <button onClick={() => setShowVictory(false)}
                className="font-orbitron font-black text-xs tracking-widest text-muted-foreground hover:text-white transition-colors border border-white/10 px-6 py-3 rounded-xl">
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main boss card */}
      <div className="glass p-6 rounded-2xl border-red-900/30 bg-red-900/5 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.1),transparent_60%)] pointer-events-none" />
        <div className="absolute top-0 right-0 p-4 text-red-800 pointer-events-none">
          <Flame size={56} opacity={0.2} />
        </div>

        {/* Floating damage numbers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          <AnimatePresence>
            {floatingDmgs.map(d => (
              <motion.div key={d.id}
                initial={{ opacity: 1, y: 0, scale: 1.2 }}
                animate={{ opacity: 0, y: -70, scale: 0.9 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{ left: `${d.x}%`, position: "absolute", top: "40%" }}
                className="font-orbitron font-black text-red-400 text-xl drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
              >
                -{d.value.toLocaleString()} DMG
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="text-[9px] font-bold text-red-400 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" /> WORLD BOSS EVENT
              </div>
              <h3 className="text-xl font-orbitron font-black tracking-widest uppercase"
                style={{ color: "#ff4444", textShadow: "0 0 20px rgba(239,68,68,0.6)" }}>
                {boss.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-mono text-red-500 bg-red-900/30 border border-red-800/50 px-2 py-0.5 rounded tracking-widest">
                  {BOSS_ROSTER.find(b => b.name === boss.name)?.rank || "S"}-RANK BOSS
                </span>
                <span className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
                  <Users size={10} /> {boss.participants.toLocaleString()} raiders
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-mono text-muted-foreground mb-1 uppercase tracking-widest">TIME LEFT</div>
              <div className="text-sm font-orbitron font-bold text-red-400">{timeStr}</div>
            </div>
          </div>

          {/* HP section */}
          <div className="mb-5">
            <div className="flex justify-between text-[10px] font-mono mb-2">
              <span className="text-red-400 font-bold">
                {Math.floor(boss.current_hp).toLocaleString()} / {boss.max_hp.toLocaleString()} HP
              </span>
              <span className="text-muted-foreground">{hpPct.toFixed(1)}%</span>
            </div>
            <motion.div
              animate={hpShake ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className="h-3 bg-black/70 rounded-full overflow-hidden border border-red-900/40"
            >
              <motion.div
                initial={false}
                animate={{ width: `${hpPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${hpColor} rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]`}
              />
            </motion.div>
          </div>

          {/* Abilities flavor text */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {(BOSS_ROSTER.find(b => b.name === boss.name)?.abilities || ["Overwhelming Presence"]).map(ability => (
              <span key={ability} className="text-[8px] font-mono text-red-500/70 bg-red-900/20 border border-red-900/30 px-2 py-0.5 rounded-full">
                ⚡ {ability}
              </span>
            ))}
          </div>

          {/* AI personality flavor blurb — additive, shows only when Ollama responds */}
          {aiBlurb && (
            <div className="mt-3 mb-5 text-[10px] font-mono text-red-300/80 italic border-t border-red-900/20 pt-3">
              <TypingText text={aiBlurb} speedMs={22} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowMiniWorkout(true)}
              disabled={isAttacking}
              className="flex-1 py-4 rounded-xl font-orbitron font-black text-xs tracking-[0.3em] uppercase transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #991b1b, #ef4444)",
                color: "#fff",
                boxShadow: "0 6px 30px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
              }}
            >
              <Swords size={14} /> {isAttacking ? "STRIKING..." : "⚔️ DEAL DAMAGE"}
            </button>
            <button
              onClick={() => setShowRetreatModal(true)}
              className="px-5 py-4 rounded-xl font-orbitron font-black text-xs tracking-widest uppercase border border-white/10 text-muted-foreground hover:text-white hover:border-white/20 transition-all flex items-center gap-2"
            >
              <RotateCcw size={12} /> RETREAT
            </button>
          </div>
        </div>
      </div>
    </>
  );

}
