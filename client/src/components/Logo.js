import React from 'react';

let _cc = 0;

/**
 * variant="dark"  (default) — white outer C, vivid inner ring. For dark navbars/hero backgrounds.
 * variant="light"           — dark navy outer C, same vivid inner ring. For white cards (Login, Register).
 */
export default function Logo({ size = 28, variant = 'dark', style }) {
  const uid = React.useRef(null);
  if (uid.current === null) uid.current = ++_cc;
  const p = `cc${uid.current}`;

  const isLight = variant === 'light';
  const outerStroke = isLight ? `url(#${p}-oc)` : 'rgba(255,255,255,0.88)';
  const tmFill = isLight ? 'rgba(28,42,64,0.5)' : 'rgba(255,255,255,0.5)';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} aria-hidden="true">
      <defs>
        {/* Outer C — dark navy gradient, only used in light variant */}
        {isLight && (
          <linearGradient id={`${p}-oc`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#121C2C" />
            <stop offset="100%" stopColor="#1C3060" />
          </linearGradient>
        )}
        {/* Inner C — vivid blue-to-teal, lifts off any background */}
        <linearGradient id={`${p}-ic`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5BAFF0" />
          <stop offset="50%" stopColor="#42A0E8" />
          <stop offset="100%" stopColor="#2ED4C2" />
        </linearGradient>
        {/* Checkmark — bright aqua sweep */}
        <linearGradient id={`${p}-ck`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#62C8FF" />
          <stop offset="100%" stopColor="#2EE0CC" />
        </linearGradient>
        {/* Radiant glow behind inner elements */}
        <filter id={`${p}-gw`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer C arc — white on dark, dark navy on light */}
      <path
        d="M 84.8,75.3 A 43,43 0 1,1 84.8,24.7"
        fill="none"
        stroke={outerStroke}
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Inner C arc — vivid blue-to-teal gradient with glow */}
      <path
        d="M 71.8,65.9 A 27,27 0 1,1 71.8,34.1"
        fill="none"
        stroke={`url(#${p}-ic)`}
        strokeWidth="7"
        strokeLinecap="round"
        filter={`url(#${p}-gw)`}
      />

      {/* Checkmark — bright aqua-teal with radiant glow */}
      <path
        d="M 33,54 L 44,64 L 67,38"
        fill="none"
        stroke={`url(#${p}-ck)`}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${p}-gw)`}
      />

      {/* Trademark symbol — top-right of the C gap */}
      <text
        x="87"
        y="15"
        fontSize="13"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="400"
        fill={tmFill}
        textAnchor="start"
      >™</text>
    </svg>
  );
}
