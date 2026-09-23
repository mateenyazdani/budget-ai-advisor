import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/BudgetHUD.css';

// The arc shows how far through its own pacing window the month is — a real,
// computed fraction (days elapsed / days in month) — not a live "spent so
// far today" figure, which this app has no way to know without a connected
// bank account it deliberately doesn't have yet.
function daysInMonth(today = new Date()) {
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
}

function money(currency, amount) {
  return `${currency}${Math.round(amount).toLocaleString()}`;
}

const R = 60;
const CIRC = 2 * Math.PI * R;

function BudgetHUD({ insight, currency, onFitBudget, fitActive }) {
  if (!insight) return null;

  const total = daysInMonth();
  const elapsed = total - insight.daysLeft;
  const frac = Math.max(0.04, elapsed / total);
  const dash = CIRC * frac;

  return (
    <div className={`budget-hud hud-${insight.status}`}>
      <div className="hud-dial-wrap">
        <svg viewBox="0 0 160 160" className="hud-dial-svg" aria-hidden="true">
          <defs>
            <linearGradient id="hudArc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={R} stroke="var(--line)" strokeWidth="14" fill="transparent" />
          <circle
            cx="80" cy="80" r={R}
            stroke="url(#hudArc)" strokeWidth="14" fill="transparent"
            strokeDasharray={`${dash} ${CIRC}`}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div className="hud-dial-inner">
          <span className="hud-label">Today's safe spend</span>
          <span className="hud-amount">{money(currency, insight.safeToday)}</span>
          <span className="hud-sub">{insight.daysLeft}d left this month</span>
        </div>
      </div>

      <p className="hud-week-note">
        {money(currency, insight.safeThisWeek)} to pace the rest of this week
      </p>

      <div className="hud-actions">
        {insight.safeToday > 0 && (
          <button
            className={`hud-filter-pill ${fitActive ? 'on' : ''}`}
            onClick={() => onFitBudget(insight.safeToday)}
          >
            🟢 Fits today's budget (≤ {money(currency, insight.safeToday)})
          </button>
        )}
        {/* A real log, not a demo button — it goes to the same expense
            logger Dashboard already saves through, rather than a number
            that only ever updates local state and nothing real. */}
        <Link to="/dashboard" className="hud-log-link">+ Log an expense</Link>
        <Link to="/dashboard" className="hud-dashboard-link">Full budget →</Link>
      </div>
    </div>
  );
}

export default BudgetHUD;
