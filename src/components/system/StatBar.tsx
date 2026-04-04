"use client";

import { motion } from 'framer-motion';

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

export function StatBar({ label, value, max, color = "bg-primary" }: StatBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-tighter text-foreground/70">{label}</span>
        <span className="text-xs font-bold text-primary">{value} / {max}</span>
      </div>
      <div className="h-2 w-full bg-border/30 rounded-full overflow-hidden border border-border/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full ${color} shadow-[0_0_10px_rgba(59,130,246,0.5)]`}
        />
      </div>
    </div>
  );
}
