import React from 'react';

// A miniature of the real dashboard, built in CSS rather than a screenshot, so
// it stays truthful when the product changes and costs nothing to load.
const SEGMENTS = [
  { label: 'Home & bills', value: '€915', share: 34, color: '#2a78d6' },
  { label: 'Food & drink', value: '€400', share: 15, color: '#eb6834' },
  { label: 'Life & fun', value: '€348', share: 13, color: '#e87ba4' },
  { label: 'Savings', value: '€300', share: 11, color: '#008300' },
  { label: 'Health & family', value: '€135', share: 5, color: '#eda100' },
  { label: 'Getting around', value: '€55', share: 2, color: '#1baf7a' },
];

function ProductShot() {
  return (
    <div className="product-shot" aria-hidden="true">
      <div className="shot-chrome">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span className="shot-url">budget-ai-advisor.vercel.app</span>
      </div>

      <div className="shot-body">
        <div className="shot-hero">
          <span className="shot-eyebrow">Left over each month</span>
          <span className="shot-amount">€847</span>
          <span className="shot-sub">€3,000 coming in · €2,153 going out</span>
        </div>

        <div className="shot-bar">
          {SEGMENTS.map((s) => (
            <span key={s.label} style={{ width: `${s.share * 2.4}%`, background: s.color }} />
          ))}
          <span className="shot-left" style={{ width: `${28 * 2.4}%` }} />
        </div>

        <ul className="shot-rows">
          {SEGMENTS.slice(0, 4).map((s) => (
            <li key={s.label}>
              <span className="shot-swatch" style={{ background: s.color }} />
              <span className="shot-label">{s.label}</span>
              <span className="shot-value">{s.value}</span>
              <span className="shot-share">{s.share}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ProductShot;
