import React from 'react';

// Plain stroked icons, sized by the surrounding font-size and inheriting text
// colour — emoji look like placeholders and render differently per platform.
const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export const ChartIcon = (p) => (
  <svg {...base} {...p}><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></svg>
);

export const BasketIcon = (p) => (
  <svg {...base} {...p}><path d="M3 7h18l-1.6 11.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 7Z" /><path d="M8 7 12 2l4 5" /></svg>
);

export const BankIcon = (p) => (
  <svg {...base} {...p}><path d="M3 9 12 4l9 5" /><path d="M5 9v9M10 9v9M14 9v9M19 9v9" /><path d="M3 20h18" /></svg>
);

export const ChatIcon = (p) => (
  <svg {...base} {...p}><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8Z" /></svg>
);

export const TagIcon = (p) => (
  <svg {...base} {...p}><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.3" /></svg>
);

export const TrainIcon = (p) => (
  <svg {...base} {...p}><rect x="5" y="3" width="14" height="13" rx="3" /><path d="M5 10h14" /><path d="m7 21 2-3M17 21l-2-3" /><circle cx="9" cy="13" r=".8" /><circle cx="15" cy="13" r=".8" /></svg>
);

export const DocIcon = (p) => (
  <svg {...base} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></svg>
);

export const ShieldIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);

// Wordmark: a small ledger glyph plus the name, which reads as a product
// rather than a placeholder the way an emoji does.
export function Wordmark({ className = '' }) {
  return (
    <span className={`wordmark ${className}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="wordmark-glyph">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" />
        <path d="M8 15.5V11m4 4.5V8.5m4 7V12.5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
      <span className="wordmark-text">Budget<span className="wordmark-accent">AI</span></span>
    </span>
  );
}
