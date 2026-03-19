"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Notification } from "@/lib/gameReducer";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Bell, Zap, Ghost, AlertTriangle, X } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DISMISS_DURATIONS: Record<string, number> = {
  QUEST:       4000,
  WORKOUT:     4500,
  REWARD:      5000,
  SHADOW:      5000,
  CHAPTER:     6500,
  GUILD:       5000,
  PVP:         5000,
  ACHIEVEMENT: 5000,
  INFO:        5000,
  SYSTEM:      5000,
  LEVELUP:     7000,
};

function NotifItem({ n, onDismiss }: { n: Notification; onDismiss: (id: string) => void }) {
  const isUrgent = n.title.includes("URGENT") || n.title.includes("PENALTY");
  const duration = isUrgent ? null : (DISMISS_DURATIONS[n.type] ?? 5000);

  useEffect(() => {
    if (!duration) return; // URGENT: no auto-dismiss
    const t = setTimeout(() => onDismiss(n.id), duration);
    return () => clearTimeout(t);
  }, [n.id, duration, onDismiss]);

  const isLevelUp = n.type === "LEVELUP" || n.title.includes("LEVEL");
  const isShadow = n.type === "SHADOW" || n.type === "CHAPTER";

  const accentColor = isLevelUp ? "#06B6D4" : isShadow ? "#7C3AED" : isUrgent ? "#EF4444" : "#E2E8F0";
  const Icon = isLevelUp ? Zap : isShadow ? Ghost : isUrgent ? AlertTriangle : Bell;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)", transition: { duration: 0.2 } }}
      className="pointer-events-auto relative group cursor-pointer"
      onClick={() => onDismiss(n.id)}
    >
      <div className={cn(
        "system-panel p-5 min-w-[320px] max-w-[400px] border-l-4 transition-all hover:bg-white/[0.05]",
        isUrgent ? "border-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.2)]" :
        isLevelUp ? "border-[#06B6D4] shadow-[0_0_20px_rgba(6,182,212,0.2)]" :
        "border-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.2)]"
      )}>
        {/* Scanning Line Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
           <motion.div
             animate={{ y: ["0%", "100%", "0%"] }}
             transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
             className="w-full h-[1px] bg-white"
           />
        </div>

        <div className="flex items-start gap-4">
           <div className={cn(
             "w-10 h-10 flex items-center justify-center corner-cut border transition-transform group-hover:scale-110",
             isUrgent ? "bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444]" :
             isLevelUp ? "bg-[#06B6D4]/10 border-[#06B6D4]/40 text-[#06B6D4]" :
             "bg-[#7C3AED]/10 border-[#7C3AED]/40 text-[#7C3AED]"
           )}>
              <Icon size={20} />
           </div>

           <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                 <span className="text-[10px] font-system tracking-[0.3em] font-black uppercase opacity-60">
                   {isUrgent ? "[ SYSTEM_ALERT ]" : "[ NOTIFICATION ]"}
                 </span>
                 <span className="text-[8px] font-system text-slate-500 uppercase">Received_Now</span>
              </div>

              <h4 className="font-title font-black text-[#E2E8F0] text-sm tracking-wider uppercase mb-1">{n.title}</h4>
              <p className="text-[11px] font-system text-slate-400 uppercase leading-relaxed tracking-wide">{n.body}</p>

              {isUrgent && (
                <div className="mt-4 flex gap-3">
                   <button className="flex-1 py-2 bg-[#EF4444] text-white font-title font-black text-[9px] tracking-widest uppercase hover:bg-[#F87171] transition-all corner-cut shadow-[0_5px_15px_rgba(239,68,68,0.3)]">
                      ACCEPT_ENTRY
                   </button>
                   <button className="px-3 bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-all corner-cut">
                      <X size={12} />
                   </button>
                </div>
              )}
           </div>
        </div>

        {/* Progress bar for auto-dismiss */}
        {!isUrgent && (
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: (duration ?? 5000) / 1000, ease: "linear" }}
            style={{ transformOrigin: "left", backgroundColor: accentColor }}
            className="absolute bottom-0 left-0 right-0 h-[2px] opacity-40"
          />
        )}
      </div>
    </motion.div>
  );
}

export default function SystemNotification({
  notifications,
  onDismiss,
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] space-y-4 pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        {notifications.slice(0, 3).map((n) => (
          <NotifItem key={n.id} n={n} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
