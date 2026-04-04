"use client";

import React from "react";

export default function ManaEffect() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <filter id="liquid-glass">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" seed="1">
            <animate attributeName="baseFrequency" values="0.015;0.025;0.015" dur="10s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        
        <linearGradient id="mana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#11D2EF', stopOpacity: 0.2 }} />
          <stop offset="100%" style={{ stopColor: '#011BDE', stopOpacity: 0.1 }} />
        </linearGradient>
      </defs>
    </svg>
  );
}
