"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Settings2, Volume2, Eye, Shield, Bell, User, X, Zap, Activity, Info, AlertTriangle } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { GameState } from "@/lib/gameReducer";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function SettingToggle({ label, desc, value, onChange, accent = "#06B6D4" }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void, accent?: string }) {
  return (
    <div className="flex items-center justify-between py-6 border-b border-white/5 last:border-0 group select-none cursor-pointer" onClick={() => onChange(!value)}>
      <div>
        <div className="text-[12px] font-title font-black text-[#E2E8F0] tracking-widest uppercase italic group-hover:text-white transition-colors">
          {label.replace(/ /g, "_")}
        </div>
        <div className="text-[9px] font-system text-slate-600 font-black uppercase tracking-[0.3em] italic mt-1.5 group-hover:text-slate-400 transition-colors">
          {desc}
        </div>
      </div>
      <div className="relative w-14 h-6 px-1 flex items-center corner-cut border border-white/10 bg-black/40 group-hover:border-white/20 transition-all">
        <motion.div 
          className="w-4 h-4 corner-cut shadow-[0_0_10px_currentColor]" 
          style={{ color: value ? accent : "#334155" }}
          animate={{ x: value ? 30 : 0, backgroundColor: value ? accent : "#1E293B" }} 
          transition={{ type: "spring", stiffness: 500, damping: 30 }} 
        />
        <div 
          className="absolute inset-x-1 h-[2px] opacity-10 pointer-events-none" 
          style={{ backgroundColor: value ? accent : "transparent", top: '50%', transform: 'translateY(-50%)' }}
        />
      </div>
    </div>
  );
}

export default function Settings({ state, dispatch, onClose }: { state: GameState; dispatch: React.Dispatch<any>; onClose: () => void }) {
  const [sounds, setSounds] = useState(true);
  const [arCamera, setArCamera] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [penaltyMode, setPenaltyMode] = useState(true);
  const [particles, setParticles] = useState(true);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md italic"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 30 }} 
        animate={{ scale: 1, y: 0 }} 
        className="w-full max-w-2xl system-panel border-[#06B6D4]/30 bg-[#030308]/90 p-10 relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Background Decal */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
           <Settings2 size={200} className="text-white" />
        </div>

        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="p-3 corner-cut bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4]">
               <Settings2 size={24} />
            </div>
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
                  <span className="text-[10px] font-system text-[#06B6D4] font-black tracking-[0.5em] uppercase">SYSTEM_CONFIGURATION</span>
               </div>
               <h2 className="text-3xl font-title font-black text-[#E2E8F0] tracking-widest uppercase italic">CONTROL_UNIT</h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 hex-frame border border-white/10 flex items-center justify-center text-slate-500 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-6 custom-scrollbar relative z-10">
          {/* Profile Quick Snapshot */}
          <div className="system-panel p-6 bg-white/[0.02] border-white/5 mb-10 group hover:border-[#06B6D4]/20 transition-all">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 hex-frame border-2 border-[#06B6D4] bg-[#06B6D4]/10 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <User size={32} className="text-[#06B6D4]" />
              </div>
              <div>
                <div className="font-title font-black text-2xl text-[#E2E8F0] tracking-widest italic mb-2 uppercase">{state.user.username}</div>
                <div className="flex items-center gap-6">
                   <div className="text-[10px] font-system text-[#06B6D4] font-black tracking-widest uppercase italic">RANK: {(state.user as any).rank}-CLASS</div>
                   <div className="w-1 h-1 rounded-full bg-slate-800" />
                   <div className="text-[10px] font-system text-slate-500 font-black tracking-widest uppercase italic font-system">LVL_{state.user.level}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="system-panel bg-black/40 border-white/5 px-8 py-2 mb-10">
            <SettingToggle label="System Sounds" desc="Level-up notification and quest completion audio sync." value={sounds} onChange={setSounds} />
            <SettingToggle label="Particle Effects" desc="High-fidelity mana particles and UI resonance glows." value={particles} onChange={setParticles} accent="#7C3AED" />
            <SettingToggle label="AR Tracking" desc="MediaPipe vision algorithms for rep counting verification." value={arCamera} onChange={setArCamera} />
            <SettingToggle label="Quest Alerts" desc="Priority transmissions for daily training cycles." value={notifications} onChange={setNotifications} />
            <SettingToggle label="Penalty Mode" desc="Automatic dungeon deployment on training failure." value={penaltyMode} onChange={setPenaltyMode} accent="#EF4444" />
          </div>

          <div className="system-panel p-8 border-[#EF4444]/20 bg-[#EF4444]/5 group hover:bg-[#EF4444]/8 transition-all">
            <div className="flex items-center gap-3 mb-4">
               <AlertTriangle size={18} className="text-[#EF4444] animate-pulse" />
               <div className="text-[10px] font-system tracking-[0.4em] text-[#EF4444] font-black uppercase italic">DANGER_ZONE_OVERRIDE</div>
            </div>
            <p className="text-[10px] text-slate-500 font-system font-black uppercase tracking-widest italic mb-8 leading-relaxed">
               RESETTING_HUNTER_DATA_WILL_PERMANENTLY_PURGE_LEVELS_SHADOWS_AND_RANKING_CERTIFICATES. THIS_ACTION_CANNOT_BE_REVERSED.
            </p>
            <button className="w-full py-5 corner-cut text-[10px] font-title font-black text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444] hover:text-white transition-all tracking-[0.5em] uppercase italic">
               PURGE_SYSTEM_SIGNATURE
            </button>
          </div>
        </div>

        {/* Technical Footer */}
        <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center text-slate-800 text-[8px] font-system font-black uppercase tracking-[0.4em] italic relative z-10">
           <div className="flex items-center gap-4">
              <Zap size={10} /> VERSION_1.0.4-SHADOW
           </div>
           <div className="flex items-center gap-4">
              LINK_STATUS: STABLE [NODE_4] <Activity size={10} />
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
