import React, { useState, useMemo } from 'react';
import '../styles/WhatIfSlider.css';

const WEEKS_PER_MONTH = 4.345;

function money(currency, amount) {
  return `${currency}${Math.round(amount).toLocaleString()}`;
}

// "Predictive insight" only means something when the prediction is honest
// about what it doesn't know. A 3-month safety net is a standard, named
// benchmark — not a number invented for this widget — and the projection is
// skipped entirely rather than guessed when there's no real savings figure
// to project from.
function WhatIfSlider({ budget, discretionary }) {
  const { currency, categories = {}, surplus, totalExpenses, currentSavings } = budget;

  const options = useMemo(
    () => discretionary.filter((d) => (categories[d.name] || 0) > 0),
    [discretionary, categories]
  );

  const [categoryName, setCategoryName] = useState(() => {
    if (!options.length) return null;
    return [...options].sort((a, b) => (categories[b.name] || 0) - (categories[a.name] || 0))[0].name;
  });
  const [pct, setPct] = useState(20);

  if (!categoryName || !options.length) return null;

  const amount = categories[categoryName] || 0;
  const cutAmount = Math.round(amount * (pct / 100));
  const newSurplus = surplus + cutAmount;

  const target = totalExpenses * 3;
  const hasSavingsFigure = typeof currentSavings === 'number' && Number.isFinite(currentSavings);

  let projection = null;
  if (hasSavingsFigure) {
    const remaining = Math.max(target - currentSavings, 0);
    if (remaining === 0) {
      projection = { kind: 'already-there' };
    } else {
      const baseSave = Math.max(surplus, 0);
      const newSave = Math.max(newSurplus, 0);
      if (baseSave <= 0 && newSave <= 0) {
        projection = { kind: 'still-not-saving' };
      } else if (baseSave <= 0 && newSave > 0) {
        projection = { kind: 'newly-on-track' };
      } else {
        const monthsBase = remaining / baseSave;
        const monthsNew = remaining / newSave;
        const weeksSooner = Math.round((monthsBase - monthsNew) * WEEKS_PER_MONTH);
        projection = { kind: 'sooner', weeksSooner };
      }
    }
  }

  return (
    <section className="whatif">
      <div className="whatif-head">
        <h2>What if?</h2>
        <p>Move the slider — nothing here changes your actual budget until you decide it should.</p>
      </div>

      <div className="whatif-controls">
        <label className="whatif-field">
          <span>Cut</span>
          <select value={categoryName} onChange={(e) => setCategoryName(e.target.value)}>
            {options.map((o) => (
              <option key={o.name} value={o.name}>{o.name}</option>
            ))}
          </select>
        </label>

        <div className="whatif-slider-row">
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            aria-label={`Percent to cut from ${categoryName}`}
          />
          <span className="whatif-pct">{pct}%</span>
        </div>
      </div>

      <div className="whatif-result">
        <p className="whatif-headline">
          Cutting <strong>{categoryName}</strong> by <strong>{pct}%</strong> saves{' '}
          <strong>{money(currency, cutAmount)}</strong> a month.
        </p>

        {projection?.kind === 'sooner' && (
          projection.weeksSooner > 0 ? (
            <p className="whatif-sub">
              At that rate, a 3-month safety net ({money(currency, target)}) arrives{' '}
              <strong>{projection.weeksSooner} week{projection.weeksSooner === 1 ? '' : 's'} sooner</strong> than
              at your current pace.
            </p>
          ) : (
            <p className="whatif-sub">Too small a cut to move the timeline at this pace.</p>
          )
        )}
        {projection?.kind === 'newly-on-track' && (
          <p className="whatif-sub">
            Right now you are not saving anything most months. This alone would flip that to putting
            aside <strong>{money(currency, Math.max(newSurplus, 0))}</strong> a month.
          </p>
        )}
        {projection?.kind === 'still-not-saving' && (
          <p className="whatif-sub">
            Even with this cut you would still be spending more than you earn — worth looking at
            more than one category.
          </p>
        )}
        {projection?.kind === 'already-there' && (
          <p className="whatif-sub">Your savings already cover the standard 3-month safety net.</p>
        )}
        {!hasSavingsFigure && (
          <p className="whatif-sub">
            Add what you currently have saved above to see how much sooner this gets you to a
            3-month safety net.
          </p>
        )}
      </div>
    </section>
  );
}

export default WhatIfSlider;
