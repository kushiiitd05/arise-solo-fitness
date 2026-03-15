"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Sword, Users, Clock, ShieldAlert, X } from "lucide-react";
import { COLORS, RANK_COLORS } from "@/lib/constants";
import { GameState } from "@/lib/gameReducer";
import { getLeaderboard, subscribeToLeaderboardChanges, LeaderboardEntry } from "@/lib/services/leaderboardService";
import { supabase } from "@/lib/supabase";

const getRankColors = (pos: number) => {
  if (pos === 1) return "#FFD700";
  if (pos === 2) return "#C0C0C0";
  if (pos === 3) return "#CD7F32";
  return COLORS.cyan;
};

const getRankEmoji = (pos: number) => {
  if (pos === 1) return "👑";
  if (pos === 2) return "🥈";
  if (pos === 3) return "🥉";
  return `#${pos}`;
};

interface LeaderboardProps {
  state: GameState;
  onClose: () => void;
}

export default function Leaderboard({ state, onClose }: LeaderboardProps) {
  const [tab, setTab] = useState<"global" | "guild">("global");
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = state.user;

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const data = await getLeaderboard();
      setLeaders(data);
    } catch (err) {
      setError("System failed to retrieve ranking data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
    const sub = subscribeToLeaderboardChanges(fetchRankings);
    return () => { sub.unsubscribe(); };
  }, []);

  // Calculate "Power" for display (simple formula for now)
  const calculatePower = (l: LeaderboardEntry) => l.level * 1000 + (l.total_xp_earned / 10);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-xl bg-[#080514]/90 backdrop-blur-xl border border-[#7C3AED]/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#7C3AED]/10 flex items-center justify-between">
          <div>
            <h2 className="font-orbitron font-black text-2xl text-[#A855F7] tracking-tighter">LEADERBOARD</h2>
            <p className="text-[10px] font-mono text-[#94A3B8] tracking-[0.2em] uppercase">World Hunter Rankings</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#E2E8F0] p-2"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-white/5 bg-white/5">
          {["global", "guild"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`flex-1 py-4 text-[10px] font-orbitron font-bold tracking-widest transition-all relative ${
                tab === t ? "text-[#A855F7]" : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              {t.toUpperCase()}
              {tab === t && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#A855F7]" />
              )}
            </button>
          ))}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 animate-pulse text-[#A855F7] font-orbitron text-sm">
              <Clock className="mb-4" size={32} />
              FETCHING RANKINGS...
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-10 font-mono text-sm border border-red-500/20 rounded-xl bg-red-500/5">
              <ShieldAlert className="mx-auto mb-3" size={32} />
              {error}
            </div>
          ) : tab === "guild" ? (
             <div className="p-8 text-center text-[#94A3B8] italic">
                <Users className="mx-auto mb-4 opacity-20" size={48} />
                <p className="font-orbitron font-bold text-sm">GUILD RANKINGS COMING SOON</p>
                <p className="text-[10px] font-mono mt-1 opacity-50">Join or Create a Guild to compete with allies.</p>
             </div>
          ) : (
            <div className="space-y-3">
              {leaders.length === 0 ? (
                <div className="p-8 text-center text-[#94A3B8] italic">
                  <Users className="mx-auto mb-4 opacity-20" size={48} />
                  <p className="font-orbitron font-bold text-sm">NO HUNTERS AWAKENED</p>
                  <p className="text-[10px] font-mono mt-1 opacity-50">Be the first to claim the throne.</p>
                </div>
              ) : leaders.map((hunter, idx) => {
                const pos = idx + 1;
                const isMe = hunter.id === user.id;
                const rankColor = getRankColors(pos);
                const power = calculatePower(hunter);

                return (
                  <motion.div
                    key={hunter.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all border ${
                      isMe ? "bg-[#FFD700]/10 border-[#FFD700]/50 shadow-[0_0_15px_rgba(255,215,0,0.2)]" : "bg-white/5 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="w-10 text-center font-orbitron font-black text-lg" style={{ color: rankColor }}>
                      {getRankEmoji(pos)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-orbitron font-bold text-sm text-[#E2E8F0] truncate">{hunter.username}</h3>
                        {isMe && <span className="text-[8px] bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/50 px-1.5 py-0.5 rounded font-mono uppercase font-black">You</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-mono text-[#94A3B8]">
                        <span className="flex items-center gap-1">
                          <Crown size={8} className="text-[#A855F7]" /> LVL {hunter.level}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sword size={8} className="text-[#A855F7]" /> {hunter.hunter_rank}-RANK {hunter.job_class}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-orbitron font-black text-sm" style={{ color: rankColor }}>
                        {power.toLocaleString()}
                      </div>
                      <div className="text-[8px] font-mono text-[#94A3B8] uppercase tracking-wider">PWR</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between px-8">
          <div className="flex gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#A855F7] animate-pulse" />
                <span className="text-[9px] font-mono text-[#94A3B8] uppercase">Live Feed</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-[9px] font-mono text-[#94A3B8] uppercase">Realtime Active</span>
             </div>
          </div>
          <p className="text-[9px] font-mono text-[#94A3B8] italic">"Only the strong survive."</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
