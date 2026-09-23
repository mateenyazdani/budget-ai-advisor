import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ExpenseLogger from './ExpenseLogger';
import PriceCheck from './PriceCheck';
import { groupBudget } from '../utils/budgetGroups';
import { calculateComprehensiveBudget } from '../utils/budgetCalculator';
import { getInsights, DISCRETIONARY } from '../utils/insights';
import WhatIfSlider from './WhatIfSlider';
import { BasketIcon, BankIcon, ChatIcon } from './Icons';
import '../styles/Dashboard.css';

function money(currency, amount) {
  return `${currency}${Math.round(amount).toLocaleString()}`;
}

function Dashboard({ budget, onStartOver, onBudgetChange }) {
  const [currentBudget, setCurrentBudget] = useState(budget);
  const [openGroup, setOpenGroup] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  // Every figure starts as a modelled average, so any of them can be replaced
  // with what the person actually pays.
  const saveOverride = (name) => {
    const value = draft.trim();
    setEditing(null);
    if (value === '') return;

    const amount = parseFloat(value);
    if (!Number.isFinite(amount) || amount < 0) return;

    const answers = {
      ...(currentBudget.answers || {}),
      categoryOverrides: { ...(currentBudget.answers?.categoryOverrides || {}), [name]: amount },
    };

    try {
      const next = calculateComprehensiveBudget({
        ...answers,
        monthlyIncome: currentBudget.monthlyIncome,
        age: currentBudget.age,
        country: (currentBudget.answers?.country) || 'spain',
      });
      const merged = { ...next, answers };
      setCurrentBudget(merged);
      onBudgetChange?.(merged, answers);
    } catch {
      // Leave the figure as it was if the recalculation cannot be done.
    }
  };

  const { currency, monthlyIncome, totalExpenses, surplus } = currentBudget;
  const groups = groupBudget(currentBudget.categories);
  const insight = getInsights(currentBudget);
  const inTheGreen = surplus >= 0;

  // Segments are sized against income when there is money left, so the bar
  // reads as "your month" rather than just "your spending".
  const scale = Math.max(monthlyIncome, totalExpenses);
  const leftoverShare = Math.max(surplus, 0) / scale;

  const handleExpenseAdd = (data) => {
    const spent = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    setCurrentBudget((prev) => ({
      ...prev,
      surplus: prev.monthlyIncome - (prev.totalExpenses + spent),
    }));
  };

  return (
    <div className="dashboard">
      {insight && (
        <section className={`decide decide-${insight.status}`}>
          <div className="decide-main">
            <span className="decide-label">Safe to spend this week</span>
            <span className="decide-amount">{money(currency, insight.safeThisWeek)}</span>
            <span className="decide-note">
              Day-to-day spending only, across the {insight.daysLeft} days left this month.
            </span>
            {insight.safeToday > 0 && (
              <Link className="decide-cta" to={`/discover?budget=${insight.safeToday}`}>
                See what fits {money(currency, insight.safeToday)} today →
              </Link>
            )}
          </div>

          <div className="decide-side">
            <div className="decide-stat">
              <span className="decide-label">On track to save</span>
              <span className="decide-stat-value">{money(currency, insight.projectedSaving)}</span>
              <span className="decide-note">{insight.savingRate}% of your income</span>
            </div>

            {insight.action ? (
              <div className="decide-action">
                <span className="decide-badge">Do this</span>
                <p>
                  Cut <strong>{insight.action.category}</strong> by{' '}
                  <strong>{money(currency, insight.action.reduceBy)}</strong> a month — you are at{' '}
                  {money(currency, insight.action.amount)} against a typical{' '}
                  {money(currency, insight.action.target)} on your income.
                </p>
              </div>
            ) : (
              <div className="decide-action">
                <span className="decide-badge">
                  {insight.status === 'risk' ? 'Watch out' : 'Looking good'}
                </span>
                <p>
                  {insight.status === 'risk'
                    ? 'Your plan spends more than you earn. Open a group below and correct any figure that is wrong before cutting anything.'
                    : 'Nothing is unusually high for your income. Check the figures below against a statement to be sure.'}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="hero-panel">
        <div className="hero-figure">
          <span className="hero-label">
            {inTheGreen ? 'Left over each month' : 'Short each month'}
          </span>
          <span className={`hero-amount ${inTheGreen ? 'positive' : 'negative'}`}>
            {inTheGreen ? '' : '−'}{money(currency, Math.abs(surplus))}
          </span>
          <span className="hero-sub">
            {money(currency, monthlyIncome)} coming in · {money(currency, totalExpenses)} going out
            {currentBudget.childCount > 0 && ` · ${currentBudget.childCount} child${currentBudget.childCount > 1 ? 'ren' : ''}`}
          </span>
        </div>

        {currentBudget.currentSavings !== null && currentBudget.currentSavings !== undefined && (
          <div className="runway">
            <div>
              <span className="runway-label">Saved</span>
              <span className="runway-value">{money(currency, currentBudget.currentSavings)}</span>
            </div>
            <div>
              <span className="runway-label">That covers</span>
              <span className="runway-value">
                {currentBudget.monthsOfRunway} month{currentBudget.monthsOfRunway === 1 ? '' : 's'}
              </span>
            </div>
            <p className="runway-note">
              How long your savings would last at this rate if the income stopped.
            </p>
          </div>
        )}

        <div className="allocation">
          <div className="allocation-bar" role="img" aria-label="How your income is allocated">
            {groups.map((g) => (
              <div
                key={g.id}
                className="allocation-segment"
                style={{ width: `${(g.total / scale) * 100}%`, background: g.color }}
                title={`${g.label}: ${money(currency, g.total)}`}
              />
            ))}
            {leftoverShare > 0 && (
              <div
                className="allocation-segment leftover"
                style={{ width: `${leftoverShare * 100}%` }}
                title={`Left over: ${money(currency, surplus)}`}
              />
            )}
          </div>

          <ul className="allocation-legend">
            {groups.map((g) => (
              <li key={g.id}>
                <span className="swatch" style={{ background: g.color }} aria-hidden="true" />
                <span className="legend-label">{g.label}</span>
                <span className="legend-value">{money(currency, g.total)}</span>
                <span className="legend-share">{Math.round((g.total / monthlyIncome) * 100)}%</span>
              </li>
            ))}
            {leftoverShare > 0 && (
              <li>
                <span className="swatch leftover-swatch" aria-hidden="true" />
                <span className="legend-label">Left over</span>
                <span className="legend-value">{money(currency, surplus)}</span>
                <span className="legend-share">{Math.round((surplus / monthlyIncome) * 100)}%</span>
              </li>
            )}
          </ul>
        </div>
      </section>

      <WhatIfSlider budget={currentBudget} discretionary={DISCRETIONARY} />

      <div className="quick-actions">
        <Link className="quick-card primary" to="/bank">
          <span className="quick-icon"><BankIcon /></span>
          <span className="quick-title">Check against reality</span>
          <span className="quick-sub">
            Everything above is an estimate. Drop in a statement to see what you really spent.
          </span>
        </Link>
        <Link className="quick-card" to="/deals">
          <span className="quick-icon"><BasketIcon /></span>
          <span className="quick-title">Cheap food &amp; deals</span>
          <span className="quick-sub">
            Places near you under {money(currency, Math.max(surplus, 0))}
          </span>
        </Link>
        <Link className="quick-card" to="/advisor">
          <span className="quick-icon"><ChatIcon /></span>
          <span className="quick-title">Ask the advisor</span>
          <span className="quick-sub">Answers about your own numbers</span>
        </Link>
      </div>

      <section className="breakdown">
        <div className="section-head">
          <h2>Where it goes</h2>
          <p>Open a row, then click any amount to replace the estimate with what you actually pay.</p>
        </div>

        {groups.map((g) => {
          const share = (g.total / totalExpenses) * 100;
          const open = openGroup === g.id;
          return (
            <div key={g.id} className={`group-row ${open ? 'open' : ''}`}>
              <button
                className="group-head"
                onClick={() => setOpenGroup(open ? null : g.id)}
                aria-expanded={open}
              >
                <span className="swatch" style={{ background: g.color }} aria-hidden="true" />
                <span className="group-label">{g.label}</span>
                <span className="group-count">{g.items.length}</span>
                <span className="group-total">{money(currency, g.total)}</span>
                <span className="group-share">{share.toFixed(0)}%</span>
                <span className="group-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
              </button>

              <div className="group-track" aria-hidden="true">
                <div className="group-fill" style={{ width: `${share}%`, background: g.color }} />
              </div>

              {open && (
                <ul className="group-items">
                  {g.items.map((item) => (
                    <li key={item.name}>
                      <span className="item-name">{item.name}</span>
                      <span className="item-track" aria-hidden="true">
                        <span
                          className="item-fill"
                          style={{ width: `${(item.amount / g.items[0].amount) * 100}%`, background: g.color }}
                        />
                      </span>
                      {editing === item.name ? (
                        <input
                          className="item-input"
                          type="number"
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => saveOverride(item.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveOverride(item.name);
                            if (e.key === 'Escape') setEditing(null);
                          }}
                          aria-label={`What you actually pay for ${item.name}`}
                        />
                      ) : (
                        <button
                          className={`item-amount ${currentBudget.answers?.categoryOverrides?.[item.name] !== undefined ? 'edited' : ''}`}
                          onClick={() => { setEditing(item.name); setDraft(String(item.amount)); }}
                          title="Click to enter what you actually pay"
                        >
                          {money(currency, item.amount)}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {currentBudget.recommendations?.length > 0 && (
        <section className="advice">
          <div className="section-head">
            <h2>Worth knowing</h2>
          </div>
          <ul>
            {currentBudget.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </section>
      )}

      <ExpenseLogger budget={currentBudget} onExpenseAdd={handleExpenseAdd} />

      <PriceCheck age={currentBudget.age} />

      <div className="actions">
        <Link className="btn-restart" to="/edit">Adjust my answers</Link>
        <button className="btn-restart subtle" onClick={onStartOver}>Start fresh</button>
      </div>
    </div>
  );
}

export default Dashboard;
