import React from 'react';
import '../styles/SpendTrend.css';

// A real trend line, not a decorative wave — built from the same "expenses"
// entries ExpenseLogger and every "log this too" button already write to
// localStorage. `id` is that entry's own Date.now(), so it doubles as a
// reliable per-day bucket key without parsing a locale-formatted date
// string back apart.
const DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function readSeries() {
  let expenses;
  try {
    expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  } catch {
    return null;
  }
  if (!Array.isArray(expenses) || expenses.length === 0) return null;

  const today = startOfDay(Date.now());
  const buckets = new Map();
  for (let i = 0; i < DAYS; i++) buckets.set(today - i * DAY_MS, 0);

  let any = false;
  for (const e of expenses) {
    const day = startOfDay(e.id ?? Date.now());
    if (!buckets.has(day)) continue;
    const amount = Number(e.amount);
    if (!Number.isFinite(amount)) continue;
    buckets.set(day, buckets.get(day) + amount);
    any = true;
  }
  if (!any) return null;

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([day, total]) => ({ day, total }));
}

// A hand-rolled line rather than a charting library — seven points and a
// total is not worth a dependency.
function Sparkline({ series }) {
  const w = 280;
  const h = 64;
  const max = Math.max(...series.map((p) => p.total), 1);
  const stepX = w / (series.length - 1 || 1);

  const points = series.map((p, i) => {
    const x = i * stepX;
    const y = h - (p.total / max) * (h - 10) - 4;
    return [x, y];
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="trend-svg" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#trendFill)" />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 4 : 2.5} fill="var(--brand)" />
      ))}
    </svg>
  );
}

function SpendTrend({ currency = '€' }) {
  const series = readSeries();
  if (!series) return null;

  const total = series.reduce((s, p) => s + p.total, 0);
  const weekday = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'narrow' });

  return (
    <div className="spend-trend">
      <div className="trend-head">
        <span className="trend-label">Last {DAYS} days</span>
        <span className="trend-total">{currency}{Math.round(total).toLocaleString()}</span>
      </div>
      <Sparkline series={series} />
      <div className="trend-days" aria-hidden="true">
        {series.map((p) => <span key={p.day}>{weekday(p.day)}</span>)}
      </div>
    </div>
  );
}

export default SpendTrend;
