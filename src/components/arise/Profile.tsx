"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS, RANK_COLORS, JOB_CLASS_ICONS, JOB_CLASS_COLORS } from "@/lib/constants";
import { GameState } from "@/lib/gameReducer";
import { nextRankInfo } from "@/lib/game/xpEngine";
import type { HunterRank } from "@/lib/game/xpEngine";
import { X, Sword, Shield, Zap, Eye, Brain, Activity, User, Target } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STAT_INFO: Record<string, { icon: any; color: string }> = {
  strength: { icon: Sword, color: "#EF4444" },
  vitality: { icon: Activity, color: "#10B981" },
  agility: { icon: Zap, color: "#F59E0B" },
  intelligence: { icon: Brain, color: "#A855F7" },
  perception: { icon: Eye, color: "#06B6D4" },
  sense: { icon: Target, color: "#06B6D4" }
};

interface ProfileProps {
  state: GameState;
  onClose: () => void;
  onTrialStart: () => void;
}

export default function Profile({ state, onClose, onTrialStart }: ProfileProps) {
  const user = state.user as any;
  const rankColor = RANK_COLORS[(user as any).rank as keyof typeof RANK_COLORS] || COLORS.cyan;
  const jobColor = JOB_CLASS_COLORS[user.jobClass as keyof typeof JOB_CLASS_COLORS] || COLORS.cyan;
  const jobIcon = JOB_CLASS_ICONS[user.jobClass as keyof typeof JOB_CLASS_ICONS] || "⚡";

  const stats = [
    { key: "strength", label: "STRENGTH", value: (user as any).stats?.strength || 10 },
    { key: "vitality", label: "VITALITY", value: (user as any).stats?.vitality || 10 },
    { key: "agility", label: "AGILITY", value: (user as any).stats?.agility || 10 },
    { key: "intelligence", label: "INTELLIGENCE", value: (user as any).stats?.intelligence || 10 },
    { key: "perception", label: "PERCEPTION", value: (user as any).stats?.perception || 10 },
    { key: "sense", label: "SENSE", value: (user as any).stats?.sense || 10 },
  ];
  const maxStat = 100;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-black/98 backdrop-blur-3xl overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.98, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        className="w-full max-w-2xl system-panel border-[#7C3AED]/30 bg-[#030308]/95 overflow-hidden flex flex-col shadow-[0_0_150px_rgba(124,58,237,0.15)] font-exo relative my-auto"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#7C3AED]/50 to-transparent" />
        
        <div className="p-12 border-b border-white/5 flex items-center justify-between relative bg-gradient-to-b from-white/[0.02] to-transparent">
          <div>
            <div className="flex items-center gap-4 mb-3">
               <div className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] shadow-[0_0_12px_rgba(6,182,212,1)] animate-pulse" />
               <h2 className="text-[11px] font-system text-[#06B6D4] font-black tracking-[0.6em] uppercase italic">SYSTEM_SYNC_STATUS</h2>
            </div>
            <h2 className="font-title font-black text-4xl text-[#E2E8F0] tracking-[0.15em] uppercase italic drop-shadow-[0_0_10px_rgba(226,232,240,0.3)]">PLAYER_PROFILE</h2>
          </div>
          <button onClick={onClose} className="p-4 bg-white/5 border border-white/10 text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/10 transition-all corner-cut flex items-center justify-center group">
             <X size={24} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        <div className="overflow-y-auto p-12 custom-scrollbar space-y-12">
           <div className="system-panel p-10 bg-white/[0.03] border-[#7C3AED]/20 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 text-white/[0.03] font-title font-black text-[12rem] group-hover:text-white/[0.06] transition-all rotate-[-15deg] pointer-events-none lowercase">
                 {user.username.slice(0, 1)}
              </div>
              
              <div className="relative shrink-0">
                <div className="w-32 h-32 hex-frame border-2 border-[#7C3AED] bg-[#7C3AED]/20 flex items-center justify-center text-7xl filter drop-shadow-[0_0_30px_rgba(124,58,237,0.5)] group-hover:rotate-12 transition-all duration-700">
                  {jobIcon}
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-6 py-1.5 corner-cut text-[10px] font-black font-title shadow-2xl text-black border border-white/20"
                  style={{ background: rankColor }}>
                  RANK_{user.rank?.toUpperCase()}
                </div>
              </div>

              <div className="text-center md:text-left relative z-10 flex-1">
                <h3 className="font-title font-black text-4xl text-[#E2E8F0] tracking-widest uppercase mb-4 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]">{user.username}</h3>
                <div className="flex flex-wrap justify-center md:justify-start gap-8">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: jobColor, color: jobColor }} />
                      <span className="text-[11px] font-system font-black tracking-[0.2em] uppercase italic" style={{ color: jobColor }}>{user.jobClass} CLASS</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#06B6D4] shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
                      <span className="text-[11px] font-system text-[#94A3B8] font-black tracking-[0.2em] uppercase italic">LEVEL_{user.level}</span>
                   </div>
                </div>
              </div>
           </div>

           <div className="p-10 bg-black/60 border border-white/10 corner-cut group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#06B6D4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex justify-between items-end text-[11px] font-system font-black tracking-[0.4em] uppercase mb-4 italic">
                <span className="text-[#06B6D4]">SYNCHRONIZATION_PROGRESS</span>
                <span className="text-[#94A3B8]">{user.currentXp?.toLocaleString()} <span className="opacity-30">/</span> {user.xpToNextLevel?.toLocaleString()} XP</span>
              </div>
              <div className="h-4 bg-white/5 corner-cut overflow-hidden border border-white/5 relative">
                <motion.div className="h-full shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                  style={{ background: `linear-gradient(90deg, #06B6D4, #7C3AED, #A855F7)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((user.currentXp || 0) / (user.xpToNextLevel || 1)) * 100)}%` }}
                  transition={{ duration: 2, ease: "circOut" }}
                />
              </div>
           </div>

           {/* RANK_PROGRESSION — dual-gate progress block */}
           {(() => {
             const nextInfo = nextRankInfo(user.rank as HunterRank);
             const totalXp = user.stats?.totalXpEarned ?? 0;
             const xpPct = Math.min(100, (totalXp / nextInfo.xpThreshold) * 100);
             const levelPct = Math.min(100, (user.level / nextInfo.levelThreshold) * 100);
             return (
               <div className="p-10 bg-black/60 border border-white/10 corner-cut group relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                 <div className="flex justify-between items-end text-[11px] font-system font-black tracking-[0.4em] uppercase mb-4 italic">
                   <span style={{ color: rankColor }}>RANK_PROGRESSION</span>
                   <span className="text-[#94A3B8]">RANK_{user.rank}</span>
                 </div>

                 {nextInfo.nextRank ? (
                   <>
                     {/* XP gate */}
                     <div className="mb-6">
                       <div className="flex justify-between text-[10px] font-system text-[#94A3B8] mb-2 uppercase tracking-widest">
                         <span>XP</span>
                         <span>{totalXp.toLocaleString()} / {nextInfo.xpThreshold.toLocaleString()}</span>
                       </div>
                       <div className="h-3 bg-white/5 corner-cut overflow-hidden border border-white/5">
                         <motion.div
                           style={{ background: `linear-gradient(90deg, ${rankColor}, #7C3AED)` }}
                           initial={{ width: 0 }}
                           animate={{ width: `${xpPct}%` }}
                           transition={{ duration: 2, ease: "circOut" }}
                           className="h-full"
                         />
                       </div>
                     </div>

                     {/* Level gate */}
                     <div>
                       <div className="flex justify-between text-[10px] font-system text-[#94A3B8] mb-2 uppercase tracking-widest">
                         <span>LEVEL</span>
                         <span>{user.level} / {nextInfo.levelThreshold}</span>
                       </div>
                       <div className="h-3 bg-white/5 corner-cut overflow-hidden border border-white/5">
                         <motion.div
                           style={{ background: "linear-gradient(90deg, #06B6D4, #7C3AED)" }}
                           initial={{ width: 0 }}
                           animate={{ width: `${levelPct}%` }}
                           transition={{ duration: 2, ease: "circOut" }}
                           className="h-full"
                         />
                       </div>
                     </div>

                     <div className="text-[10px] font-system text-[#94A3B8] mt-4 uppercase tracking-widest">
                       Next rank: <span style={{ color: rankColor }}>{nextInfo.nextRank}</span>
                     </div>

                     {/* TRIAL ELIGIBILITY + INITIATE BUTTON */}
                     {(() => {
                       const totalXp = user.stats?.totalXpEarned ?? 0;
                       const gatesMet = nextInfo.nextRank !== null
                         && user.level >= nextInfo.levelThreshold
                         && totalXp >= nextInfo.xpThreshold;

                       const cooldownMs = 24 * 60 * 60 * 1000;
                       const lastFailed = user.stats?.trialLastFailedAt ?? null;
                       const cooldownActive = lastFailed
                         ? Date.now() - new Date(lastFailed).getTime() < cooldownMs
                         : false;

                       if (cooldownActive && lastFailed) {
                         const msRemaining = new Date(lastFailed).getTime() + cooldownMs - Date.now();
                         const hh = String(Math.floor(msRemaining / 3600000)).padStart(2, "0");
                         const mm = String(Math.floor((msRemaining % 3600000) / 60000)).padStart(2, "0");
                         const ss = String(Math.floor((msRemaining % 60000) / 1000)).padStart(2, "0");
                         return (
                           <div className="mt-6 flex items-center gap-3 p-3 border border-[#DC2626]/30 corner-cut">
                             <span className="font-mono text-[12px] text-[#EF4444] uppercase tracking-widest">
                               TRIAL LOCKED — {hh}:{mm}:{ss} remaining
                             </span>
                           </div>
                         );
                       }

                       return (
                         <div className="mt-6 flex flex-col gap-2">
                           <button
                             onClick={() => { if (gatesMet) { onTrialStart(); onClose(); } }}
                             disabled={!gatesMet}
                             className="min-h-[44px] w-full border font-orbitron text-[12px] font-black tracking-[0.25em] uppercase transition-all"
                             style={{
                               borderColor: gatesMet ? "#D97706" : "rgba(217,119,6,0.3)",
                               color: gatesMet ? "#D97706" : "rgba(217,119,6,0.4)",
                               opacity: gatesMet ? 1 : 0.4,
                               cursor: gatesMet ? "pointer" : "not-allowed",
                             }}
                           >
                             INITIATE RANK TRIAL
                           </button>
                           <p className="text-[12px] text-[#94A3B8]">
                             {gatesMet
                               ? "Complete 2\u00d7 daily rep targets across all 4 exercises to advance."
                               : `Reach Level ${nextInfo.levelThreshold} and ${nextInfo.xpThreshold.toLocaleString()} rank XP to unlock trial.`
                             }
                           </p>
                         </div>
                       );
                     })()}
                   </>
                 ) : (
                   <div
                     className="text-[12px] font-system font-black tracking-[0.4em] uppercase"
                     style={{ color: rankColor }}
                   >
                     MAX RANK ACHIEVED
                   </div>
                 )}
               </div>
             );
           })()}

           <div className="space-y-6">
              <div className="flex justify-between items-center mb-10">
                 <h4 className="text-[12px] font-system text-[#7C3AED] font-black tracking-[0.5em] uppercase italic">CORE_STAT_MATRIX</h4>
                 <div className="h-[1px] flex-1 mx-8 bg-gradient-to-r from-[#7C3AED]/30 to-transparent" />
                 <div className="text-[11px] font-system text-[#94A3B8] font-black italic opacity-40">STABLE</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                {stats.map((stat) => {
                  const info = STAT_INFO[stat.key];
                  const Icon = info.icon;
                  return (
                    <div key={stat.key} className="relative group">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-4">
                           <div className="p-3 border border-white/10 bg-white/[0.04] text-[#94A3B8] group-hover:text-white group-hover:border-[#7C3AED]/50 transition-all corner-cut shadow-inner">
                              <Icon size={14} />
                           </div>
                           <span className="text-[12px] font-system text-[#94A3B8] font-black tracking-[0.2em] uppercase group-hover:text-[#06B6D4] transition-colors">{stat.label}</span>
                        </div>
                        <span className="text-xl font-orbitron font-black text-white italic tracking-wider">{stat.value}</span>
                      </div>
                      <div className="h-2 bg-white/5 border border-white/[0.05] overflow-hidden">
                        <motion.div className="h-full"
                          style={{ backgroundColor: info.color, boxShadow: `0 0 15px ${info.color}60` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(stat.value / maxStat) * 100}%` }}
                          transition={{ duration: 1.5, ease: "backOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>

           <div className="system-panel p-12 bg-gradient-to-br from-[#D97706]/10 to-transparent border-[#D97706]/30 text-center relative overflow-hidden group shadow-[inset_0_0_50px_rgba(217,119,6,0.05)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.15),transparent_75%)] pointer-events-none" />
              <div className="relative z-10">
                <div className="text-[11px] font-system text-[#D97706] tracking-[1em] font-black uppercase mb-4 italic opacity-80">COMBAT_POWER_INDEX</div>
                <div className="font-orbitron text-6xl font-black text-[#D97706] italic tracking-tighter drop-shadow-[0_0_30px_rgba(217,119,6,0.5)]">
                  {(user.level * 100 + Object.values((user as any).stats || {}).reduce((a: number, b: unknown) => a + (typeof b === "number" ? b * 10 : 0), 0)).toLocaleString()}
                </div>
              </div>
           </div>
        </div>
        
        <div className="p-8 bg-black/80 border-t border-white/10 flex items-center justify-between px-16">
           <div className="flex gap-10">
              <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                 <span className="text-[10px] font-system text-slate-500 font-black uppercase tracking-widest italic">NEURAL_LINK</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                 <span className="text-[10px] font-system text-slate-500 font-black uppercase tracking-widest italic">BIOMETRIC_LOCK</span>
              </div>
           </div>
           <p className="text-[10px] font-system text-slate-800 italic font-black uppercase tracking-[0.4em] opacity-50">ARISE_SYSTEM_STABLE_4.0</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
