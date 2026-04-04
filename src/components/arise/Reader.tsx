"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, X, Lock, Eye } from "lucide-react";

interface ReaderProps {
  chapterId: string;
  onClose: () => void;
  isUnlocked: boolean;
}

const PANEL_TEXTS = [
  "SYSTEM: NEW QUEST AVAILABLE",
  "DUNGEON GATE DETECTED",
  "HUNTER STATUS: LEVEL UP",
  "SHADOW EXTRACTION COMPLETE",
  "DAILY QUEST ACCEPTED",
  "ARISE...",
  "STATUS WINDOW UPDATED",
  "RANK PROMOTION AVAILABLE",
  "PENALTY ZONE ACTIVATED",
  "SHADOW ARMY DEPLOYED",
  "BOSS RAID INITIATED",
  "SYSTEM: ANOMALY DETECTED",
];

const STATS_SETS = [
  ["STR", "VIT", "AGI", "INT"],
  ["STR", "PER", "SEN", "AGI"],
  ["VIT", "INT", "STR", "SEN"],
];

const ACCENTS = [
  { border: "rgba(124,58,237,0.35)",  text: "#06B6D4", bg: "#050510" },
  { border: "rgba(6,182,212,0.25)",   text: "#A855F7", bg: "#060512" },
  { border: "rgba(99,102,241,0.3)",   text: "#E2E8F0", bg: "#050810" },
];

const PANEL_MIN_HEIGHT = 340;
const INITIAL_PANELS = 12;
const PANELS_PER_LOAD = 4;
const MAX_PANELS = 40;

// Stable random values per panel index to avoid re-renders
function panelSeed(i: number, slot: number) {
  return ((i * 7 + slot * 13) % 180) + 20;
}

function PanelItem({ index, total }: { index: number; total: number }) {
  const accent = ACCENTS[index % ACCENTS.length];
  const text   = PANEL_TEXTS[index % PANEL_TEXTS.length];
  const stats  = STATS_SETS[index % STATS_SETS.length];
  const bgLabel = index % 3 === 0 ? "ARISE" : index % 3 === 1 ? "SYSTEM" : "HUNTER";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: (index % 4) * 0.04 }}
      style={{
        minHeight: PANEL_MIN_HEIGHT,
        background: accent.bg,
        border: `1px solid ${accent.border}`,
      }}
      className="relative w-full overflow-hidden"
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: `inset 0 0 40px ${accent.border}` }}
      />

      {/* Big faded bg text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[140px] font-black font-orbitron leading-none"
          style={{ color: "rgba(255,255,255,0.018)", letterSpacing: "0.3em" }}>
          {bgLabel}
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 p-8 flex flex-col justify-between" style={{ minHeight: PANEL_MIN_HEIGHT }}>
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ background: accent.text }} />
            <span className="text-[10px] font-share-tech-mono tracking-[0.3em] uppercase"
              style={{ color: accent.text }}>
              Panel {(index % 4) + 1}
            </span>
          </div>
          <span className="text-[9px] font-share-tech-mono text-slate-600 tracking-widest">
            {String(index + 1).padStart(3, "0")} / {String(total).padStart(3, "0")}
          </span>
        </div>

        {/* Central content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 py-8">
          <p className="text-xs font-share-tech-mono tracking-[0.4em] uppercase text-center leading-relaxed"
            style={{ color: accent.text }}>
            {text}
          </p>
          <div className="w-20 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent.text}80, transparent)` }} />
          <div className="flex gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={stat} className="flex flex-col gap-1">
                <span className="text-[8px] font-share-tech-mono text-slate-500 tracking-widest">{stat}</span>
                <span className="text-sm font-orbitron text-slate-300 font-black">
                  {String(panelSeed(index, i)).padStart(3, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${accent.text}30, transparent)` }} />
          <span className="text-[8px] font-share-tech-mono text-slate-600 tracking-widest uppercase">ARISE SYSTEM · AUTHORIZED</span>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(270deg, ${accent.text}30, transparent)` }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function Reader({ chapterId, onClose, isUnlocked }: ReaderProps) {
  const chapterNumber = parseInt(chapterId) || 1;

  const [panelCount, setPanelCount] = useState(INITIAL_PANELS);
  const [readProgress, setReadProgress] = useState(0);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Restore saved reading position
  useEffect(() => {
    const saved = localStorage.getItem(`arise_read_${chapterId}`);
    if (saved && scrollRef.current) {
      const idx = parseInt(saved) || 0;
      setReadProgress(idx);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = idx * PANEL_MIN_HEIGHT;
        }
      }, 120);
    }
  }, [chapterId]);

  // Track reading progress on scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop } = scrollRef.current;
    const idx = Math.min(Math.floor(scrollTop / PANEL_MIN_HEIGHT), panelCount - 1);
    setReadProgress(idx);
    localStorage.setItem(`arise_read_${chapterId}`, String(idx));
  }, [chapterId, panelCount]);

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && panelCount < MAX_PANELS) {
          setPanelCount(prev => Math.min(prev + PANELS_PER_LOAD, MAX_PANELS));
        }
      },
      { root: container, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [panelCount]);

  // Locked state
  if (!isUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-[#030308] font-exo flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="max-w-md w-full">
          <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-8">
            <Lock className="text-red-500" size={40} />
          </div>
          <h2 className="text-3xl font-orbitron font-black text-white mb-3 tracking-wider">ACCESS DENIED</h2>
          <p className="text-[10px] font-share-tech-mono text-purple-400 tracking-[0.3em] uppercase mb-6">
            CLASSIFICATION: RESTRICTED
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            The System has sealed this archive. Reach the required power level through battle and training to unlock this chapter.
          </p>
          <button
            onClick={onClose}
            className="w-full py-4 bg-purple-700 hover:bg-purple-600 text-white font-orbitron font-black tracking-[0.3em] text-sm uppercase rounded-lg transition-colors"
          >
            [ RETURN TO TRAINING ]
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#030308] font-exo flex flex-col"
    >
      {/* Top bar */}
      <div
        className="flex-shrink-0 h-14 flex items-center justify-between px-4 z-10"
        style={{ borderBottom: "1px solid rgba(124,58,237,0.3)", background: "rgba(3,3,8,0.95)", backdropFilter: "blur(8px)" }}
      >
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={22} />
        </button>

        <div className="text-center">
          <div className="text-xs font-orbitron text-purple-400 tracking-[0.3em] uppercase font-black">
            Chapter {chapterNumber}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <Eye size={10} className="text-cyan-500" />
            <span className="text-[9px] font-share-tech-mono text-slate-500 tracking-widest">
              Panel {readProgress + 1} / {panelCount}
            </span>
          </div>
        </div>

        <button onClick={onClose} className="p-2 text-slate-600 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Scrollable reader */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-2xl mx-auto">
          {Array.from({ length: panelCount }).map((_, i) => (
            <PanelItem key={i} index={i} total={panelCount} />
          ))}

          {/* Load more sentinel */}
          {panelCount < MAX_PANELS ? (
            <div ref={sentinelRef} className="flex items-center justify-center py-8">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-purple-500"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="w-px h-10 bg-gradient-to-b from-purple-500 to-transparent" />
              <span className="text-xs font-share-tech-mono text-purple-400 tracking-[0.3em] uppercase">
                End of Archive
              </span>
              <button
                onClick={onClose}
                className="mt-4 px-8 py-3 border border-purple-700/50 text-purple-400 font-orbitron text-xs tracking-widest uppercase hover:border-purple-500 hover:text-purple-300 transition-colors rounded"
              >
                [ Close Archive ]
              </button>
            </div>
          )}
        </div>

        {/* Bottom fade overlay */}
        <div
          className="pointer-events-none fixed bottom-0 left-0 right-0 h-20"
          style={{ background: "linear-gradient(to top, #030308, transparent)" }}
        />
      </div>
    </motion.div>
  );
}
