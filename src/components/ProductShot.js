import React from 'react';

// A miniature of the real Discover page, built in CSS rather than a
// screenshot, so it stays truthful when the product changes and costs
// nothing to load. The venue and price are real results this app has
// actually returned for Madrid, not invented for the mockup.
const CHIPS = ['€10', '€15', '€20', '€30'];

const RESULTS = [
  { name: 'Restaurant La Campana', price: '€9', fits: true, rating: '4.5' },
  { name: 'Padel Alameda Xperience', price: '€20', fits: false, rating: '5.0' },
];

function ProductShot() {
  return (
    <div className="product-shot" aria-hidden="true">
      <div className="shot-chrome">
        <span className="dot" /><span className="dot" /><span className="dot" />
        <span className="shot-url">bargainly.app</span>
      </div>

      <div className="shot-body">
        <span className="shot-eyebrow">How much do you want to spend?</span>
        <div className="shot-budget-row">
          {CHIPS.map((c, i) => (
            <span key={c} className={`shot-chip ${i === 0 ? 'on' : ''}`}>{c}</span>
          ))}
        </div>

        <ul className="shot-results">
          {RESULTS.map((r) => (
            <li key={r.name} className="shot-result">
              <div className="shot-result-top">
                <span className="shot-result-name">{r.name}</span>
                {r.fits && <span className="shot-fits">Fits</span>}
              </div>
              <span className="shot-result-meta">
                <span className="shot-result-price">{r.price}</span>
                <span className="shot-result-rating">★ {r.rating}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ProductShot;
