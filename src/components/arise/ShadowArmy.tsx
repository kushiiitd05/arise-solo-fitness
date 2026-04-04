"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Shield, Loader2, PlayCircle, PlusSquare, X, Ghost, Info, Sword } from "lucide-react";
import { getUserShadows, UserShadow } from "@/lib/services/shadowService";
import { SHADOWS_DB } from "@/lib/game/shadowSystem";
import { systemAudio } from "@/lib/audio";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ShadowArmyProps {
  userId: string;
  shadows: string[];
  stats: any;
  extractionTokens: number;              // controls ARISE button disabled state
  onExtractionChange?: () => void;       // callback to trigger stat re-merge in page.tsx
  dispatch?: React.Dispatch<any>;        // for ADD_NOTIFICATION dispatch
}

export default function ShadowArmy({
  userId,
  shadows: localShadowIds,
  stats,
  extractionTokens,
  onExtractionChange,
  dispatch,
}: ShadowArmyProps) {
  const [persistentShadows, setPersistentShadows] = useState<UserShadow[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedShadow, setSelectedShadow] = useState<UserShadow | null>(null);

  useEffect(() => {
    const fetchShadows = async () => {
      try {
        setLoading(true);
        const data = await getUserShadows(userId);
        setPersistentShadows(data);
      } catch (err) {
        console.error("[ShadowArmy] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShadows();
  }, [userId]);

  const handleArise = async () => {
    if (extracting || loading || extractionTokens === 0) return;
    setExtracting(true);
    systemAudio?.playMana();
    setMessage("ARISE...");

    try {
      // Get auth session for Bearer token
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessage("EXTRACTION FAILED");
        setExtracting(false);
        setTimeout(() => setMessage(""), 4000);
        return;
      }

      const res = await fetch("/api/shadows/extract", {
        method: "POST",
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (data.complete) {
        setMessage("YOUR ARMY IS COMPLETE");
        setExtracting(false);
        setTimeout(() => setMessage(""), 4000);
        return;
      }

      if (data.success && data.shadow) {
        systemAudio?.playRankUp();
        setMessage(`SHADOW EXTRACTED: ${data.shadow.name}`);
        dispatch?.({
          type: "ADD_NOTIFICATION",
          payload: {
            type: "QUEST",
            title: `SHADOW EXTRACTED: ${data.shadow.name}`,
            body: `${data.shadow.rank}-rank shadow added to your army`,
            icon: "👤",
          },
        });
        // Refresh local shadow list
        const updated = await getUserShadows(userId);
        setPersistentShadows(updated);
        // Trigger stat re-merge in page.tsx
        onExtractionChange?.();
      } else {
        systemAudio?.playError();
        setMessage("EXTRACTION FAILED");
        dispatch?.({
          type: "ADD_NOTIFICATION",
          payload: {
            type: "QUEST",
            title: "EXTRACTION FAILED",
            body: "The soul resisted extraction",
            icon: "💀",
          },
        });
      }
    } catch (err) {
      console.error("[ShadowArmy] Extraction error:", err);
      setMessage("EXTRACTION FAILED");
    } finally {
      setExtracting(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  return (
    <div className="system-panel p-6 md:p-10 min-h-[700px] flex flex-col font-exo bg-[#030308]/60 overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.05),transparent_60%)] pointer-events-none" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 border-b border-white/5 pb-8 relative z-10">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#7C3AED] shadow-[0_0_10px_rgba(124,58,237,0.6)]" />
              <h2 className="text-[10px] font-system text-[#7C3AED] font-black tracking-[0.5em] uppercase">MONARCH_SHADOW_CORE</h2>
           </div>
           <h3 className="text-3xl font-title font-black text-[#E2E8F0] tracking-widest uppercase flex items-center gap-4 italic">
             <Ghost size={28} className="text-[#7C3AED] glow-purple" /> SHADOW_ARMY
           </h3>
        </div>

        <div className="flex flex-col items-end gap-3">
          {/* TOKENS | ARMY POWER stat chip */}
          {(() => {
            const armyPower = persistentShadows.reduce((sum, ps) => sum + (ps.shadows?.base_power ?? 0), 0);
            return (
              <div className="flex items-center gap-4 text-[9px] font-system font-black tracking-[0.3em] uppercase">
                <span className={extractionTokens > 0 ? "text-[#7C3AED]" : "text-[#7C3AED]/40"}>
                  TOKENS: {extractionTokens}
                </span>
                <span className="text-white/20">|</span>
                <span className="text-[#E2E8F0]">
                  ARMY POWER: {armyPower.toLocaleString()}
                </span>
              </div>
            );
          })()}

          {/* ARISE button — token gate added in Plan 01 */}
          <button
            onClick={handleArise}
            disabled={extracting || loading || extractionTokens === 0}
            title={extractionTokens === 0 ? "Defeat a boss to earn extraction tokens" : undefined}
            className="relative px-8 py-4 group disabled:opacity-30 corner-cut focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/60"
          >
            <div className="absolute inset-0 bg-[#7C3AED] group-hover:bg-[#A855F7] transition-all" />
            <div className="relative z-10 flex items-center gap-3 text-white font-title font-black text-xs tracking-[0.3em] uppercase">
              {extracting ? <Loader2 size={16} className="animate-spin" /> : <PlusSquare size={16} />}
              ARISE
            </div>
            <div className="absolute inset-x-0 -bottom-1 h-3 bg-black/40 blur-md opacity-50" />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* SOLDIER GRID AREA */}
        <div className="xl:col-span-12 xl:grid xl:grid-cols-12 xl:gap-10">
           <div className="xl:col-span-8">
              {loading ? (
                 <div className="flex flex-col items-center justify-center h-80 text-[#7C3AED] animate-pulse">
                    <Loader2 size={48} className="animate-spin mb-4" />
                    <span className="text-[11px] font-system tracking-[0.4em] uppercase font-black">Scanning Shadow Plane...</span>
                 </div>
              ) : persistentShadows.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-30 group cursor-pointer" onClick={handleArise}>
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#7C3AED]/40 flex items-center justify-center text-5xl mb-6 group-hover:scale-110 transition-transform">🌑</div>
                  <p className="text-[10px] font-system font-black uppercase tracking-[0.4em] text-[#7C3AED]">The dimension is empty. Call them forth.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {persistentShadows.map((ps) => {
                      const shadow = SHADOWS_DB.find(s => s.id === ps.shadow_id);
                      if (!shadow) return null;
                      const isSelected = selectedShadow?.id === ps.id;
                      return (
                        <motion.div
                          key={ps.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          whileHover={{ y: -6 }}
                          onClick={() => { systemAudio?.playClick(); setSelectedShadow(ps); }}
                          className={cn(
                            "system-panel p-6 border transition-all group relative overflow-hidden cursor-pointer",
                            isSelected ? "border-[#7C3AED] bg-[#7C3AED]/10 shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "border-[#7C3AED]/10 bg-[#030308]/40 hover:border-[#7C3AED]/40 hover:bg-[#030308]/80 hover:shadow-[0_0_30px_rgba(124,58,237,0.15),inset_0_0_20px_rgba(124,58,237,0.03)]"
                          )}
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl pointer-events-none group-hover:opacity-10 transition-opacity font-system">
                            {shadow.image}
                          </div>
                          <div className="flex items-center gap-6 mb-6 relative z-10">
                            <div className="text-6xl filter drop-shadow-[0_0_25px_rgba(124,58,237,0.5)] group-hover:drop-shadow-[0_0_40px_rgba(124,58,237,0.9)] group-hover:scale-110 transition-all duration-500">
                              {shadow.image}
                            </div>
                            <div>
                              <h4 className="font-title font-black text-lg text-[#E2E8F0] tracking-widest uppercase italic">{shadow.name}</h4>
                              <div className="flex items-center gap-3 mt-1.5">
                                 <span className="px-2 py-0.5 corner-cut bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#7C3AED] text-[9px] font-black uppercase tracking-widest">
                                   {shadow.rank}-RANK
                                 </span>
                                 <span className="text-[10px] font-system text-slate-500 uppercase font-black tracking-widest">LV {ps.level}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 relative z-10">
                            <div className="p-4 bg-black/60 rounded-xl border border-white/5 corner-cut group-hover:border-[#7C3AED]/20 transition-colors">
                              <div className="text-[9px] font-system text-slate-500 uppercase tracking-[0.4em] mb-2 flex items-center gap-2 font-black italic">
                                 <Zap size={10} className="text-[#7C3AED]" /> SYNC_BUFF
                              </div>
                              <div className="text-[11px] font-system font-black text-[#7C3AED] uppercase tracking-widest">
                                +{Math.round((shadow.buff.multiplier - 1) * 100)}% {shadow.buff.stat.toUpperCase()} OUTPUT
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-white/[0.03] flex items-center justify-between">
                             <span className="text-[8px] font-system text-slate-600 font-black uppercase tracking-[0.2em]">DEPLOYS_READY</span>
                             <span className="text-[8px] font-system text-[#7C3AED]/50 font-black uppercase tracking-widest italic">S_{ps.id.slice(0,6)}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
           </div>

           {/* SHADOW DETAILS PANEL */}
           <div className="xl:col-span-4">
              <AnimatePresence mode="wait">
                {selectedShadow ? (
                  <motion.div
                    key={selectedShadow.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="system-panel p-8 bg-black/60 border-[#7C3AED]/30 flex flex-col h-full relative overflow-hidden"
                  >
                     <div className="absolute top-0 right-0 p-6 opacity-[0.02] pointer-events-none">
                        <h4 className="text-[100px] font-title font-black text-white leading-none tracking-tighter italic">ARISE</h4>
                     </div>

                     <div className="flex justify-between items-start mb-10 relative z-10">
                        <div className="flex flex-col">
                           <span className="text-[9px] font-system text-[#7C3AED] font-black tracking-[0.3em] uppercase mb-1">UNIT_PROFILE_X</span>
                           <h4 className="text-3xl font-title font-black text-[#E2E8F0] tracking-widest uppercase italic">
                              {SHADOWS_DB.find(s => s.id === selectedShadow.shadow_id)?.name}
                           </h4>
                        </div>
                        <button onClick={() => setSelectedShadow(null)} className="p-2 text-slate-600 hover:text-white transition-colors border border-white/5 rounded-lg">
                           <X size={20} />
                        </button>
                     </div>

                     <div className="flex flex-col items-center mb-10">
                        <div className="w-40 h-40 relative flex items-center justify-center group">
                           <div className="absolute inset-0 bg-[#7C3AED]/10 rounded-full blur-3xl group-hover:bg-[#7C3AED]/25 transition-all duration-700" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
                           <div className="text-9xl filter drop-shadow-[0_0_50px_rgba(124,58,237,0.8)] group-hover:drop-shadow-[0_0_80px_rgba(124,58,237,1)] z-10 scale-110 transition-all duration-700">
                              {SHADOWS_DB.find(s => s.id === selectedShadow.shadow_id)?.image}
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6 flex-1 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-white/[0.02] border border-white/5 corner-cut">
                              <span className="text-[8px] font-system text-slate-500 uppercase tracking-widest font-black block mb-1">SOUL_LEVEL</span>
                              <span className="text-xl font-title text-[#E2E8F0] font-black font-system tracking-widest italic">{selectedShadow.level}</span>
                           </div>
                           <div className="p-4 bg-white/[0.02] border border-white/5 corner-cut">
                              <span className="text-[8px] font-system text-slate-500 uppercase tracking-widest font-black block mb-1">SOUL_RANK</span>
                              <span className="text-xl font-title text-[#7C3AED] font-black font-system tracking-widest italic">
                                 {SHADOWS_DB.find(s => s.id === selectedShadow.shadow_id)?.rank}
                              </span>
                           </div>
                        </div>

                        <div className="p-5 bg-[#7C3AED]/5 border border-[#7C3AED]/20 corner-cut">
                           <div className="text-[9px] font-system text-[#7C3AED] uppercase tracking-[0.4em] mb-4 flex items-center gap-2 font-black italic">
                             <Sword size={12} /> Combat_Attributes
                           </div>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center text-[11px] font-system font-black tracking-widest text-[#E2E8F0]">
                                 <span className="text-slate-500 uppercase">SYNCHRONIZATION</span>
                                 <span className="text-[#06B6D4]">88.4%</span>
                              </div>
                              <div className="h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                                 <motion.div initial={{ width: 0 }} animate={{ width: '88.4%' }} className="h-full bg-[#06B6D4] shadow-[0_0_10px_rgba(6,182,212,0.4)]" />
                              </div>
                           </div>
                        </div>

                        <div className="p-5 bg-black/40 border border-white/5 corner-cut">
                           <div className="text-[9px] font-system text-slate-500 uppercase tracking-[0.4em] mb-2 flex items-center gap-2 font-black italic">
                             <Info size={12} className="text-[#7C3AED]" /> Archive_Notes
                           </div>
                           <p className="text-[10px] font-system text-slate-400 leading-relaxed uppercase tracking-widest italic">
                              THIS ENTITY HAS BEEN RECONSTITUTED FROM THE VOID BY THE MONARCH'S WILL. ITS LOYALTY IS ABSOLUTE.
                           </p>
                        </div>
                     </div>

                     <button className="mt-10 w-full py-5 bg-[#7C3AED] hover:bg-[#A855F7] text-[#E2E8F0] font-title font-black text-xs tracking-[0.6em] uppercase italic transition-all corner-cut shadow-[0_10px_30px_rgba(124,58,237,0.3)]">
                        DEPLOY_UNIT
                     </button>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center system-panel border-white/[0.02] bg-transparent opacity-20 p-12 text-center select-none">
                     <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#7C3AED]/30 flex items-center justify-center mb-6 animate-pulse">
                        <Ghost size={32} className="text-[#7C3AED]" />
                     </div>
                     <p className="text-[10px] font-system font-black uppercase tracking-[0.5em] leading-relaxed max-w-[200px]">
                        SELECT_SHADOW_TO_VIEW_SOUL_WAVELENGTH
                     </p>
                  </div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>

      {/* Extraction Overlay Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 system-panel p-5 px-12 border-[#7C3AED] bg-black/90 shadow-[0_0_50px_rgba(124,58,237,0.4)] z-[200] flex items-center gap-6"
          >
            <div className="w-4 h-4 rounded-full bg-[#7C3AED] animate-ping" />
            <span className="font-title font-black text-sm text-[#7C3AED] tracking-[0.4em] uppercase italic">{message}</span>
            <button onClick={() => setMessage("")} className="p-2 text-white/20 hover:text-white transition-colors"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER AUTHORITY */}
      <div className="mt-12 p-8 system-panel bg-[#7C3AED]/5 border-[#7C3AED]/20 relative group hover:border-[#7C3AED]/40 transition-all">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform">
           <Shield size={64} className="text-[#7C3AED]" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
           <div className="p-5 corner-cut bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#7C3AED] group-hover:scale-110 transition-transform">
              <Shield size={32} />
           </div>
           <div className="flex-1 text-center md:text-left">
              <h4 className="font-title font-black text-xl text-[#E2E8F0] tracking-widest mb-1 italic uppercase">EXTRACTION_AUTHORITY_SYNC</h4>
              <p className="text-[11px] font-system text-slate-500 leading-relaxed uppercase tracking-widest italic font-black">
                 YOUR_REIGN_OVER_THE_VOID_GROWS. HIGH_RANK_SOULS_REQUIRE_INCREASED_STRENGTH_MODIFIERS.
              </p>
           </div>
           <div className="text-right shrink-0">
              <div className="text-[9px] font-system text-[#7C3AED] font-black mb-1 uppercase tracking-[0.4em] italic">AUTHORITY_RANK</div>
              <div className="font-title font-black text-4xl text-[#7C3AED] glow-purple italic font-system tracking-tighter">LV_B</div>
           </div>
        </div>
      </div>
    </div>
  );
}
