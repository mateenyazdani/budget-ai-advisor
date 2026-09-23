import React, { useState } from 'react';
import { moneyTipsForCity } from '../lib/moneyTips';
import '../styles/MoneyTips.css';

// A rail of real local techniques, opening into a detail card — same shape as
// the coloured-ring shortcuts above it, but each one teaches something
// instead of filtering something. No per-tip "log €X" button: these tips
// don't carry a real, verifiable price, so nothing here pretends to log an
// actual expense the way the "+ Log an expense" link elsewhere does.
function MoneyTips({ city, onPickCategory }) {
  const [openId, setOpenId] = useState(null);
  const tips = moneyTipsForCity(city);

  if (!tips || tips.length === 0) return null;

  const active = tips.find((t) => t.id === openId) || null;

  return (
    <div className="money-tips">
      <div className="mt-head">
        <span className="mt-title">Local money-saving tips</span>
        <span className="mt-sub">{city}</span>
      </div>
      <div className="mt-rail">
        {tips.map((t) => (
          <button key={t.id} type="button" className="mt-item" onClick={() => setOpenId(t.id)}>
            <span className={`mt-icon ${t.ring}`}>{t.emoji}</span>
            <span className="mt-label">{t.title}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-modal-backdrop" onClick={() => setOpenId(null)}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`mt-modal-head ${active.ring}`}>
              <button type="button" className="mt-close" onClick={() => setOpenId(null)} aria-label="Close">✕</button>
              <span className="mt-modal-emoji" aria-hidden="true">{active.emoji}</span>
              <h3>{active.title}</h3>
              <p>{active.summary}</p>
            </div>
            <div className="mt-modal-body">
              {active.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <div className="mt-modal-actions">
                {active.link && (
                  <a className="mt-modal-link" href={active.link.url} target="_blank" rel="noopener noreferrer">
                    {active.link.label}
                  </a>
                )}
                {active.actionLabel && (
                  <button
                    type="button"
                    className="mt-modal-action"
                    onClick={() => {
                      onPickCategory(active.actionCategory, active.actionBudget ?? null);
                      setOpenId(null);
                    }}
                  >
                    {active.actionLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoneyTips;
