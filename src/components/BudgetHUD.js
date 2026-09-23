import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/BudgetHUD.css';

// The ring shows how far through its own pacing window the month is — a real,
// computed fraction (days elapsed / days in month) — not a live "spent so
// far today" figure, which this app has no way to know without a connected
// bank account it deliberately doesn't have yet.
function daysInMonth(today = new Date()) {
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
}

function money(currency, amount) {
  return `${currency}${Math.round(amount).toLocaleString()}`;
}

function BudgetHUD({ insight, currency, onFitBudget, fitActive }) {
  if (!insight) return null;

  const total = daysInMonth();
  const elapsed = total - insight.daysLeft;
  const pct = Math.round((elapsed / total) * 100);

  return (
    <div className={`budget-hud hud-${insight.status}`}>
      <div className="hud-ring-wrap">
        <div
          className="hud-ring"
          style={{ background: `conic-gradient(var(--brand) ${pct}%, var(--line) ${pct}%)` }}
          aria-hidden="true"
        >
          <span className="hud-ring-inner">{insight.daysLeft}d</span>
        </div>
        <div className="hud-figures">
          <span className="hud-label">Today's safe spend</span>
          <span className="hud-amount">{money(currency, insight.safeToday)}</span>
          <span className="hud-sub">{money(currency, insight.safeThisWeek)} across the rest of this week</span>
        </div>
      </div>

      <div className="hud-actions">
        {insight.safeToday > 0 && (
          <button
            className={`hud-filter-pill ${fitActive ? 'on' : ''}`}
            onClick={() => onFitBudget(insight.safeToday)}
          >
            🟢 Fits today's budget (≤ {money(currency, insight.safeToday)})
          </button>
        )}
        <Link to="/dashboard" className="hud-dashboard-link">Full budget →</Link>
      </div>
    </div>
  );
}

export default BudgetHUD;
