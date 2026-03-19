"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ShieldAlert, Award, X, ChevronRight, Zap, Lock } from "lucide-react";
import { GameState } from "@/lib/gameReducer";
import { getDailyQuests } from "@/lib/services/questService";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateQuestLore } from '@/lib/ai/prompts/questPrompt';
import { aiCache } from '@/lib/ai/sessionCache';
import { TypingText } from '@/components/system/TypingText';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface QuestBoardProps {
  state: GameState;
  dispatch: React.Dispatch<any>;
  onClose: () => void;
}

export default function QuestBoard({ state, dispatch, onClose }: QuestBoardProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "story" | "emergency">("daily");
  const [dailyQuests, setDailyQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questLores, setQuestLores] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        setLoading(true);
        const data = await getDailyQuests(state.user.id);
        if (data) {
          setDailyQuests(data.quests || []);
        }
      } catch (err) {
        console.error("[QuestBoard] Fetch error:", err);
        setError("SYSTEM_LINK_FAILURE: Data Retrieval Interrupted.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuests();
  }, [state.user.id]);

  // Lazy per-quest AI lore generator — stable callback, skips completed and already-cached quests
  const generateLoreForQuest = useCallback((quest: any) => {
    if (quest.completed) return;
    if (questLores[quest.id]) return;
    const cacheKey = `quest:${quest.id}`;
    if (aiCache.has(cacheKey)) {
      setQuestLores(prev => ({ ...prev, [quest.id]: aiCache.get(cacheKey)! }));
      return;
    }
    generateQuestLore(
      quest.name,
      quest.difficulty ?? 'NORMAL',
      state.user.jobClass ?? 'Fighter'
    ).then((lore) => {
      if (lore) {
        aiCache.set(cacheKey, lore);
        setQuestLores(prev => ({ ...prev, [quest.id]: lore }));
      }
    });
  }, [questLores, state.user.jobClass]);

  // Stagger quest lore generation 300ms apart to avoid overloading Ollama
  useEffect(() => {
    if (dailyQuests.length === 0) return;
    dailyQuests
      .filter(q => !q.completed)
      .forEach((quest, idx) => {
        setTimeout(() => generateLoreForQuest(quest), idx * 300);
      });
  }, [dailyQuests]); // generateLoreForQuest intentionally omitted — stable enough for this effect

  const allCompleted = dailyQuests.length > 0 && dailyQuests.every(q => q.completed);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-4xl system-panel flex flex-col max-h-[90vh] border-[#7C3AED]/30"
      >
        {/* Header */}
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-[#7C3AED]/20">
          <div>
            <h2 className="font-title font-black text-2xl md:text-3xl text-[#7C3AED] tracking-widest flex items-center gap-3">
              <span className="text-[#06B6D4] glow-cyan">[</span> DAILY MISSION <span className="text-[#06B6D4] glow-cyan">]</span>
            </h2>
            <p className="text-[9px] font-system text-slate-500 tracking-[0.4em] uppercase mt-2">Current Operations Interface — ID: {state.user.id.slice(0,8)}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-[#7C3AED] transition-colors p-2 hover:bg-[#7C3AED]/10 corner-cut">
             <X size={24} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#7C3AED]/10 bg-[#080514]/40">
            {["daily", "story", "emergency"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "w-full px-8 py-6 text-left text-[11px] font-title font-black tracking-[0.2em] transition-all relative group",
                  activeTab === tab ? "text-[#7C3AED] bg-[#7C3AED]/10" : "text-slate-500 hover:text-[#E2E8F0] hover:bg-white/5"
                )}
              >
                <div className="flex items-center justify-between">
                   <span>{tab.toUpperCase()}</span>
                   {activeTab === tab && <ChevronRight size={14} className="text-[#7C3AED]" />}
                </div>
                {activeTab === tab && (
                  <motion.div layoutId="tab-underline" className="absolute left-0 top-0 bottom-0 w-1 bg-[#7C3AED] shadow-[0_0_10px_rgba(124,58,237,0.6)]" />
                )}
              </button>
            ))}
            
            <div className="hidden md:block p-8 mt-auto">
               <div className="p-4 border border-[#06B6D4]/20 bg-[#06B6D4]/5 corner-cut">
                  <div className="text-[10px] font-system text-[#06B6D4] font-black mb-1">STAMINA_LEVEL</div>
                  <div className="text-lg font-title text-[#E2E8F0] glow-cyan">94%</div>
               </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar bg-[#030308]/40">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-[#06B6D4] font-title text-sm tracking-widest animate-pulse">
                <Clock className="mb-6 spin-slow" size={48} />
                SYNCHRONIZING_WITH_SYSTEM_SERVER...
              </div>
            ) : error ? (
              <div className="system-panel border-[#DC2626]/40 bg-[#DC2626]/5 p-8 text-center">
                <ShieldAlert className="mx-auto mb-4 text-[#DC2626]" size={48} />
                <div className="text-[#DC2626] font-title font-black text-lg tracking-widest">{error}</div>
                <button onClick={onClose} className="mt-8 px-6 py-2 border border-[#DC2626]/40 text-[#DC2626] font-system text-[10px] tracking-widest uppercase hover:bg-[#DC2626]/10">ABORT_INTERFACE</button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "daily" && (
                  <motion.div key="daily" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div>
                         <h3 className="text-sm font-title text-[#E2E8F0] tracking-widest">ACTIVE_GOALS</h3>
                         <p className="text-[9px] font-system text-slate-500 mt-1 uppercase">Rewards will be distributed upon total completion</p>
                      </div>
                      <div className="text-right">
                         <div className="text-lg font-title text-[#06B6D4] glow-cyan">
                           {dailyQuests.filter(q => q.completed).length}<span className="text-slate-600 mx-1">/</span>{dailyQuests.length} 
                         </div>
                         <div className="text-[8px] font-system text-slate-500 uppercase tracking-tighter">Verified Goals</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {dailyQuests.map((quest, idx) => (
                        <div key={idx} className={cn(
                          "relative p-5 transition-all group overflow-hidden border corner-cut",
                          quest.completed
                            ? "bg-[#06B6D4]/5 border-[#06B6D4]/20 opacity-60"
                            : "bg-[#080514]/60 border-white/5 hover:border-[#7C3AED]/40"
                        )}>
                          {/* ── DIFFICULTY BADGE ─────────────────────────── */}
                          {quest.difficulty && (
                            <div
                              aria-label={`Difficulty: ${quest.difficulty}`}
                              className={cn(
                                "absolute top-2 right-2 z-20 inline-flex items-center px-1.5 py-0.5 border",
                                "font-title font-black text-[9px] tracking-[0.15em] uppercase",
                                quest.difficulty === "EASY"   && "bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]",
                                quest.difficulty === "NORMAL" && "bg-[#06B6D4]/10 border-[#06B6D4]/40 text-[#06B6D4]",
                                quest.difficulty === "HARD"   && "bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444]",
                              )}
                            >
                              {quest.difficulty}
                            </div>
                          )}
                          {/* ─────────────────────────────────────────────── */}
                          <div className="relative z-10 flex items-center gap-6">
                            <div className={cn(
                              "w-12 h-12 flex items-center justify-center text-3xl border transition-all",
                              quest.completed ? "border-[#06B6D4]/40 bg-[#06B6D4]/10" : "border-[#7C3AED]/20 bg-[#7C3AED]/5"
                            )}>
                              {quest.completed ? <CheckCircle2 className="text-[#06B6D4]" /> : <span>{quest.icon || "💪"}</span>}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-title font-bold text-sm text-[#E2E8F0] truncate tracking-wide">{quest.name}</h4>
                                <div className="flex items-center gap-2">
                                   <Zap size={10} className="text-[#A855F7]" />
                                   <span className="text-[10px] font-system text-[#A855F7] font-black">+{quest.xp_reward || quest.xp || 0} XP</span>
                                </div>
                              </div>

                              {/* AI lore text — additive, renders below quest name when Ollama responds */}
                              {questLores[quest.id] && (
                                <p className="text-[9px] font-mono text-[#7C3AED]/70 italic mt-1 mb-2 leading-relaxed">
                                  <TypingText text={questLores[quest.id]} speedMs={18} />
                                </p>
                              )}

                              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(quest.current / quest.target) * 100}%` }}
                                  className={cn(
                                    "h-full transition-all duration-500",
                                    quest.completed ? "bg-[#06B6D4]" : "bg-[#7C3AED]"
                                  )}
                                />
                              </div>
                              
                              <div className="flex items-center justify-between text-[8px] font-system text-slate-500">
                                <span className="uppercase tracking-widest">Progress: {quest.current} / {quest.target}</span>
                                {quest.completed ? (
                                   <span className="text-[#06B6D4] font-black tracking-widest">GOAL_VERIFIED</span>
                                ) : (
                                   <span className="text-[#7C3AED]/60 font-black tracking-widest">IN_PROGRESS</span>
                                )}
                              </div>
                            </div>
                          </div>
                   
                          {/* Inner card glow for active */}
                          {!quest.completed && (
                             <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                          )}
                        </div>
                      ))}
                    </div>

                    {!loading && !error && dailyQuests.length === 0 && activeTab === "daily" && (
                      <div className="flex flex-col items-center justify-center h-48 text-center">
                        <div className="font-title font-black text-sm text-slate-600 tracking-[0.4em] uppercase mb-3">
                          NO_ACTIVE_MISSIONS_DETECTED
                        </div>
                        <p className="text-[10px] font-system text-slate-700 tracking-[0.2em] uppercase leading-relaxed max-w-xs">
                          The System has not issued orders for this cycle. Return at 00:00 UTC for new directives.
                        </p>
                      </div>
                    )}

                    {allCompleted && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="p-8 border-2 border-[#D97706]/40 bg-[#D97706]/10 text-center relative overflow-hidden group corner-cut"
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(217,119,6,0.1)_0%,_transparent_70%)] group-hover:scale-150 transition-transform duration-1000" />
                        <Award className="mx-auto mb-4 text-[#F59E0B] glow-gold" size={48} />
                        <div className="font-title font-black text-xl text-[#F59E0B] tracking-[0.3em] mb-2 uppercase">✦ ALL GOALS CLEARED ✦</div>
                        <p className="text-[10px] font-system text-slate-400 mt-2 tracking-widest uppercase italic">The System recognizes your achievement. Bonus rewards synchronized.</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {activeTab === "story" && (
                  <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center p-12 text-center">
                    <div className="relative mb-8">
                       <Clock className="text-slate-700 opacity-20" size={80} />
                       <Lock className="absolute inset-0 m-auto text-slate-800" size={32} />
                    </div>
                    <div className="font-title font-black text-lg text-slate-600 tracking-[0.4em] uppercase">STORY_MOD_LOCKED</div>
                    <p className="text-[10px] font-system text-slate-700 mt-4 tracking-[0.2em] uppercase leading-relaxed max-w-xs">
                       Insufficient Player progression detected. Continue daily operations to unlock higher-tier narrative arcs.
                    </p>
                  </motion.div>
                )}

                {activeTab === "emergency" && (
                  <motion.div key="emergency" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="system-panel border-[#DC2626]/40 bg-[#DC2626]/5 p-8 relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#DC2626]/10 rounded-full blur-3xl animate-pulse" />
                      
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-[#DC2626]/20 flex items-center justify-center corner-cut border border-[#DC2626]/30">
                           <ShieldAlert className="text-[#DC2626]" size={28} />
                        </div>
                        <div>
                           <h3 className="font-title font-black text-xl text-[#DC2626] tracking-tighter uppercase">EMERGENCY: GATE_BREAK</h3>
                           <div className="text-[8px] font-system text-[#DC2626]/70 tracking-[0.5em] mt-1">DANGER_LEVEL: RANK-C</div>
                        </div>
                      </div>
                      
                      <div className="p-6 bg-black/40 border border-white/5 corner-cut mb-8">
                         <p className="text-[11px] font-system text-slate-300 leading-relaxed tracking-wider uppercase">
                            "An unstable Dungeon Gate has manifested in your immediate sector. Failure to mitigate the threat within the temporal limit will trigger a MANDATORY PENALTY QUEST."
                         </p>
                      </div>
                      
                      <button className="w-full py-5 bg-[#DC2626] text-white font-title font-black text-xs tracking-[0.5em] uppercase hover:bg-[#EF4444] transition-all shadow-[0_15px_30px_rgba(220,38,38,0.4)] hover:scale-[1.02] active:scale-[0.98] corner-cut">
                        INTERVENE_IN_GATE
                      </button>
                    </div>
                    
                    <div className="text-center font-system text-[8px] text-slate-600 tracking-[0.8em] uppercase italic">The System is watching your decisions</div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-[#080514] border-t border-[#7C3AED]/10 flex items-center justify-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
            <span className="text-[8px] font-system text-slate-500 tracking-widest uppercase">System Persistance: ACTIVE</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
            <span className="text-[8px] font-system text-slate-500 tracking-widest uppercase">Neural Link: VERIFIED</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
