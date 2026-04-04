"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Target, Lock, Unlock } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DungeonPortal from "./DungeonPortal";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DungeonGate({ isOpen, onEnter }: { isOpen: boolean; onEnter: () => void }) {
  const accentColor   = isOpen ? "#06B6D4" : "#DC2626";
  const accentColorDim = isOpen ? "rgba(6,182,212,0.15)" : "rgba(220,38,38,0.08)";
  const borderColor   = isOpen ? "rgba(6,182,212,0.35)" : "rgba(220,38,38,0.15)";
  const glowColor     = isOpen ? "rgba(6,182,212,0.2)"  : "rgba(220,38,38,0.08)";

  return (
    <div className="relative w-full flex flex-col items-center overflow-hidden py-8 px-4">
      {/* Background radial ambience */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{ background: `radial-gradient(ellipse at center, ${accentColorDim} 0%, transparent 70%)` }}
      />
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
        style={{ backgroundImage: `linear-gradient(${accentColor}22 1px, transparent 1px), linear-gradient(90deg, ${accentColor}22 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
      />

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-6"
      >
        {/* Gate Grade badge */}
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="h-[1px] w-12" style={{ background: `linear-gradient(to right, transparent, ${accentColor}60)` }} />
          <div
            className="px-4 py-1 font-mono text-[9px] font-black tracking-[0.6em] uppercase"
            style={{
              border: `1px solid ${accentColor}50`,
              color: accentColor,
              background: `${accentColor}10`,
              boxShadow: `0 0 12px ${accentColor}20`,
            }}
          >
            {isOpen ? "GATE_UNLOCKED" : "GATE_SEALED"}
          </div>
          <div className="h-[1px] w-12" style={{ background: `linear-gradient(to left, transparent, ${accentColor}60)` }} />
        </div>

        <h2
          className="font-orbitron font-black text-3xl tracking-[0.15em] uppercase mb-2"
          style={{
            color: isOpen ? "#E2E8F0" : "#94A3B8",
            textShadow: isOpen ? `0 0 30px ${accentColor}60` : "none",
          }}
        >
          {isOpen ? "GATE_SYNCHRONIZED" : "GATE_STABILIZING"}
        </h2>
        <p
          className="font-mono text-[9px] tracking-[0.5em] uppercase font-black opacity-60"
          style={{ color: accentColor }}
        >
          {isOpen ? "READY_FOR_EXTRACTION" : "WAITING_FOR_MANA_RESONANCE"}
        </p>
      </motion.div>

      {/* ── PORTAL CANVAS ── */}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Outer glow ring behind canvas */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 340,
            height: 340,
            background: `radial-gradient(circle, ${accentColor}15 0%, transparent 65%)`,
            boxShadow: `0 0 60px ${accentColor}20`,
          }}
        />
        <DungeonPortal isOpen={isOpen} width={300} height={300} />
      </motion.div>

      {/* ── STATUS INDICATOR ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 flex items-center gap-6 mt-6 mb-8"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
          />
          <span className="font-mono text-[8px] font-black tracking-[0.5em] uppercase" style={{ color: accentColor }}>
            STATUS: {isOpen ? "OPEN" : "FORMING"}
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/10" />
        <div className="flex items-center gap-2">
          <Zap size={10} style={{ color: accentColor }} />
          <span className="font-mono text-[8px] font-black tracking-[0.4em] uppercase text-slate-600">
            RESONANCE: 94.2%
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/10" />
        <div className="flex items-center gap-2">
          <Target size={10} className="text-slate-700" />
          <span className="font-mono text-[8px] font-black tracking-[0.4em] uppercase text-slate-600">
            DEPTH: 1400M
          </span>
        </div>
      </motion.div>

      {/* ── ENTER BUTTON ── */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10"
        >
          <button
            onClick={onEnter}
            data-testid="enter-gate"
            className="relative group overflow-hidden font-orbitron font-black text-sm tracking-[0.5em] uppercase transition-all active:scale-95"
            style={{
              padding: "18px 48px",
              background: `linear-gradient(135deg, ${accentColor}, #38BDF8)`,
              color: "#030308",
              boxShadow: `0 0 30px ${accentColor}50, 0 15px 40px rgba(0,0,0,0.5)`,
              clipPath: "polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)",
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 50px ${accentColor}80, 0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)`)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 30px ${accentColor}50, 0 15px 40px rgba(0,0,0,0.5)`)}
          >
            {/* Shimmer sweep */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span className="relative z-10">ENTER_THE_VOID</span>
          </button>
        </motion.div>
      )}

      {/* ── LOCKED STATE ── */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex items-center gap-3 px-6 py-3 border border-[#DC2626]/20 bg-[#DC2626]/5"
          style={{ clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)" }}
        >
          <Lock size={14} className="text-[#DC2626]/60" />
          <span className="font-mono text-[9px] font-black tracking-[0.4em] uppercase text-[#DC2626]/50">
            AWAITING_MANA_RESONANCE
          </span>
        </motion.div>
      )}

      {/* ── DECORATIVE CORNER ACCENTS ── */}
      <div className="absolute top-4 left-4 w-6 h-6 pointer-events-none opacity-40"
        style={{ borderTop: `2px solid ${accentColor}`, borderLeft: `2px solid ${accentColor}` }} />
      <div className="absolute top-4 right-4 w-6 h-6 pointer-events-none opacity-40"
        style={{ borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}` }} />
      <div className="absolute bottom-4 left-4 w-6 h-6 pointer-events-none opacity-30"
        style={{ borderBottom: `2px solid rgba(124,58,237,0.6)`, borderLeft: `2px solid rgba(124,58,237,0.6)` }} />
      <div className="absolute bottom-4 right-4 w-6 h-6 pointer-events-none opacity-30"
        style={{ borderBottom: `2px solid rgba(124,58,237,0.6)`, borderRight: `2px solid rgba(124,58,237,0.6)` }} />
    </div>
  );
}
