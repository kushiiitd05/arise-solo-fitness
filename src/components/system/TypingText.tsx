'use client';

// src/components/system/TypingText.tsx
// Shared typing animation component used by all 4 AI-enhanced surfaces.
// Animates text one character at a time with a blinking cursor while in progress.
// speedMs defaults to 25ms per character (approximately "THE SYSTEM" terminal feel).

import { useState, useEffect } from 'react';

interface TypingTextProps {
  text: string;
  speedMs?: number;
  className?: string;
}

export function TypingText({ text, speedMs = 25, className }: TypingTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Reset on text change (new AI content arrived)
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speedMs);
    return () => clearInterval(interval);
  }, [text, speedMs]);

  return (
    <span className={className}>
      {displayed}
      {!done && (
        <span className="animate-pulse" aria-hidden="true">
          ▌
        </span>
      )}
    </span>
  );
}
