"use client";

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SystemWindowProps {
  children: ReactNode;
  title?: string;
  isPenalty?: boolean;
  className?: string;
}

export function SystemWindow({ children, title, isPenalty = false, className = "" }: SystemWindowProps) {
  const baseClass = isPenalty ? 'penalty-window' : 'system-window';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`p-6 ${baseClass} relative overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      {title && (
        <h2 className="text-xl font-bold text-primary text-glow mb-4 tracking-wider uppercase">
          {title}
        </h2>
      )}
      <div className="text-foreground/90 relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
