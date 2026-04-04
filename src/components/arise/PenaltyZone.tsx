"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Ghost, X, Skull, Zap, Timer } from "lucide-react";

export default function PenaltyZone({ onStart }: { onStart: () => void }) {
  const [glitchText, setGlitchText] = useState("FAILURE_DETECTED");
  
  useEffect(() => {
    const texts = ["FAILURE_DETECTED", "PROTOCOL_BROKEN", "UNFIT_LEVEL", "PENALTY_SEQUENCE"];
    const t = setInterval(() => {
      setGlitchText(texts[Math.floor(Math.random() * texts.length)]);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] bg-[#030308] flex items-center justify-center p-6 font-system overflow-hidden">
      {/* Red Pulse Ambience */}
      <motion.div 
        animate={{ opacity: [0.1, 0.3, 0.1] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 bg-[#EF4444]/10 pointer-events-none" 
      />
      
      {/* Glitch Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://media.giphy.com/media/oEI9uWUicT3I167DAb/giphy.gif')] mix-blend-screen grayscale contrast-150" />
      
      {/* Scanning Line */}
      <motion.div 
        animate={{ y: ["0%", "100%", "0%"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 w-full h-[2px] bg-[#EF4444]/5 z-10 pointer-events-none"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, filter: 'blur(20px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        className="max-w-lg w-full system-panel border-[#EF4444]/40 p-10 relative z-10 text-center bg-black/80 shadow-[0_0_100px_rgba(239,68,68,0.2)]"
      >
        <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
           <Skull size={120} className="text-[#EF4444]" />
        </div>

        <div className="w-24 h-24 rounded-full bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-8 border border-[#EF4444]/40 relative group">
          <div className="absolute inset-0 bg-[#EF4444]/20 rounded-full blur-xl animate-pulse" />
          <AlertTriangle className="text-[#EF4444] relative z-10 animate-bounce" size={48} />
        </div>

        <motion.h2 
          key={glitchText}
          initial={{ opacity: 0.5, x: -2 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl font-title font-black text-[#EF4444] tracking-[0.2em] mb-3 glow-red italic uppercase"
        >
          {glitchText}
        </motion.h2>
        
        <div className="text-[11px] font-system text-slate-500 font-black uppercase tracking-[0.6em] mb-10 flex items-center justify-center gap-4">
           <div className="h-[1px] auto bg-slate-800" />
           SYSTEM_PROTOCOLS_VIOLATED
           <div className="h-[1px] auto bg-slate-800" />
        </div>

        <div className="system-panel p-6 bg-white/[0.02] border-white/5 mb-10 text-left">
           <p className="text-[12px] font-system text-[#E2E8F0] leading-relaxed uppercase tracking-widest font-black mb-4 italic">
             "You failed to complete the <span className="text-[#EF4444]">DAILY_STRENGTH_MISSION</span>. The System has deemed you <span className="text-[#EF4444]">UNFIT</span>. Survive the Penalty Dungeon or face <span className="text-[#EF4444] underline decoration-wavy">SYSTEM_SUSPENSION</span>."
           </p>
           
           <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-4 group">
                 <div className="p-2 border border-[#EF4444]/30 bg-[#EF4444]/5 text-[#EF4444] corner-cut">
                    <Timer size={14} />
                 </div>
                 <div className="flex-1">
                    <span className="text-[9px] font-system text-slate-500 uppercase tracking-widest font-black block">Mission_Type</span>
                    <span className="text-[10px] font-system text-[#E2E8F0] uppercase tracking-widest font-black">SURVIVAL_IN_THE_SANDS</span>
                 </div>
              </div>
              <div className="flex items-center gap-4 group">
                 <div className="p-2 border border-[#EF4444]/30 bg-[#EF4444]/5 text-[#EF4444] corner-cut">
                    <Zap size={14} />
                 </div>
                 <div className="flex-1">
                    <span className="text-[9px] font-system text-slate-500 uppercase tracking-widest font-black block">Active_Debuff</span>
                    <span className="text-[10px] font-system text-[#EF4444] uppercase tracking-widest font-black">AGILITY_RATING_MINUS_50%</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
          <button 
            onClick={onStart}
            className="w-full py-6 relative overflow-hidden group corner-cut transition-all active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-[#EF4444] group-hover:bg-[#F87171] transition-all" />
            <span className="relative z-10 font-title font-black text-white text-sm tracking-[0.6em] uppercase italic">
              ENTER_THE_SANDS
            </span>
          </button>
          
          <div className="text-[9px] font-system text-slate-700 font-black tracking-[0.8em] uppercase italic transition-colors hover:text-[#EF4444]">
            ESCAPE_IS_NOT_AN_OPTION
          </div>
        </div>
      </motion.div>
    </div>
  );
}
