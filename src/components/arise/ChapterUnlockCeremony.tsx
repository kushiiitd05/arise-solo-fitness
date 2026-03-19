"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";

interface ChapterUnlockCeremonyProps {
  chapterTitle: string;
  chapterNumber: number; // 1-based display number
  externalUrl: string | null;
  onDismiss: () => void;
  dispatch: React.Dispatch<any>;
}

export default function ChapterUnlockCeremony({
  chapterTitle,
  chapterNumber,
  externalUrl,
  onDismiss,
  dispatch,
}: ChapterUnlockCeremonyProps) {
  // Fire CHAPTER notification once on mount
  useEffect(() => {
    dispatch({
      type: "ADD_NOTIFICATION",
      payload: {
        type: "CHAPTER",
        title: `CHAPTER UNLOCKED: ${chapterTitle}`,
        body: externalUrl
          ? `Chapter ${chapterNumber} is now accessible. Open from SYSTEM_LOGS.`
          : `Chapter ${chapterNumber} earned. Source URL not yet confirmed.`,
        icon: "📖",
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fires once on mount

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[200] bg-[#030308] flex flex-col items-center justify-center p-8"
      style={{
        background: `radial-gradient(ellipse at center, rgba(6,182,212,0.08), #030308 70%)`,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-12 text-center"
      >
        <div className="font-orbitron text-[28px] font-black tracking-[0.25em] uppercase text-[#06B6D4]">
          CHAPTER UNLOCKED
        </div>
      </motion.div>

      {/* Chapter reveal card */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
        className="system-panel mb-10 p-8 w-full max-w-sm text-center animate-system-pulse"
        style={{ borderColor: "rgba(6,182,212,0.4)" }}
      >
        <div className="font-mono text-[10px] text-[#94A3B8] tracking-widest uppercase mb-2">
          CHAPTER {chapterNumber}
        </div>
        <div className="font-orbitron text-[20px] font-black text-[#E2E8F0] uppercase mt-2">
          {chapterTitle}
        </div>
      </motion.div>

      {/* External link status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.9 }}
        className="mb-10"
      >
        {externalUrl ? (
          <div className="font-mono text-[11px] text-[#06B6D4] tracking-widest uppercase text-center">
            SOURCE AVAILABLE — TAP TO READ
          </div>
        ) : (
          <div className="font-mono text-[11px] text-[#94A3B8] tracking-widest uppercase text-center">
            SOURCE NOT YET AVAILABLE
          </div>
        )}
      </motion.div>

      {/* Dismiss button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 1.2 }}
        onClick={onDismiss}
        className="min-h-[44px] px-8 border font-orbitron text-[12px] font-black tracking-[0.25em] uppercase transition-all hover:bg-[#06B6D4]/10"
        style={{ borderColor: "#06B6D4", color: "#06B6D4" }}
      >
        ACKNOWLEDGE CHAPTER
      </motion.button>
    </motion.div>
  );
}
