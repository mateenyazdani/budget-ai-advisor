import React, { useState, useEffect, useCallback } from 'react';
import '../styles/SmartSpending.css';

const CATEGORIES = ['All', 'Dining', 'Groceries', 'Coffee', 'Padel', 'Gym', 'Shopping'];

// Shown only when live results are unavailable, and labelled as samples in the UI.
const SAMPLE_PLACES = [
  { id: 's1', name: 'Casa Lucio', emoji: '🍽️', rating: 4.3, ratingCount: 5200, priceLabel: '€€€', estimatedSpend: 45, distanceKm: 1.2, openNow: null, address: 'Calle Cava Baja, Madrid' },
  { id: 's2', name: 'Mercadona', emoji: '🛒', rating: 4.1, ratingCount: 890, priceLabel: '€', estimatedSpend: 20, distanceKm: 0.6, openNow: null, address: 'Calle Fuencarral, Madrid' },
  { id: 's3', name: 'Toma Café', emoji: '☕', rating: 4.5, ratingCount: 1400, priceLabel: '€', estimatedSpend: 3, distanceKm: 0.9, openNow: null, address: 'Calle Palma, Madrid' },
  { id: 's4', name: 'Padel Indoor Madrid', emoji: '🎾', rating: 4.4, ratingCount: 310, priceLabel: '€€', estimatedSpend: 28, distanceKm: 3.1, openNow: null, address: 'Retiro, Madrid' },
];

function SmartSpending({ budgetRemaining, onBack }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState('locating');
  const [notice, setNotice] = useState('');
  const [coords, setCoords] = useState(null);
  const [budgetOnly, setBudgetOnly] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('sample');
      setNotice('Your browser does not support location, so these are sample venues.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {
        setStatus('sample');
        setNotice('Location access was declined, so these are sample venues rather than places near you.');
      },
      { timeout: 10000 }
    );
  }, []);

  const loadPlaces = useCallback(async () => {
    if (!coords) return;
    setStatus('loading');
    setNotice('');
    try {
      const params = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        category: selectedCategory,
      });
      const response = await fetch(`/api/places?${params}`);
      if (!response.ok) throw new Error('Request failed');

      const data = await response.json();
      if (data.configured === false) {
        setStatus('sample');
        setNotice('No Google Places key is configured yet, so these are sample venues.');
        return;
      }
      setPlaces(data.places || []);
      setStatus('live');
    } catch (error) {
      setStatus('sample');
      setNotice('Could not load nearby venues, so these are samples.');
    }
  }, [coords, selectedCategory]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const toggleSave = (id) => {
    setSavedPlaces((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const source = status === 'live' ? places : SAMPLE_PLACES;
  const visible = source.filter((place) => {
    if (!budgetOnly) return true;
    if (place.estimatedSpend === null || place.estimatedSpend === undefined) return true;
    return place.estimatedSpend <= budgetRemaining;
  });

  return (
    <div className="smart-spending-container">
      <div className="spending-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>🎁 Smart Spending</h2>
        <div className="budget-info">
          <span>You have <strong>€{budgetRemaining.toFixed(2)}</strong> left this month</span>
        </div>
      </div>

      {status !== 'live' && notice && (
        <div className="places-notice">
          <strong>Sample data.</strong> {notice}
        </div>
      )}

      <div className="category-filter">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <label className="budget-toggle">
        <input type="checkbox" checked={budgetOnly} onChange={(e) => setBudgetOnly(e.target.checked)} />
        Only show places that fit my remaining budget
      </label>

      {status === 'locating' && <div className="places-status">Finding your location…</div>}
      {status === 'loading' && <div className="places-status">Loading nearby places…</div>}

      <div className="deals-grid">
        {visible.length > 0 ? (
          visible.map((place) => (
            <div key={place.id} className="deal-card">
              <div className="deal-header">
                <span className="deal-emoji">{place.emoji || '📍'}</span>
                {place.priceLabel && <span className="price-band">{place.priceLabel}</span>}
              </div>

              <h4>{place.name}</h4>
              {place.address && <p className="deal-description">{place.address}</p>}

              <div className="place-facts">
                {place.rating !== null && place.rating !== undefined && (
                  <span>⭐ {place.rating}{place.ratingCount ? ` (${place.ratingCount})` : ''}</span>
                )}
                {place.distanceKm !== null && place.distanceKm !== undefined && (
                  <span>📍 {place.distanceKm} km</span>
                )}
                {place.openNow === true && <span className="open-now">Open now</span>}
                {place.openNow === false && <span className="closed-now">Closed</span>}
              </div>

              <div className="spend-estimate">
                {place.estimatedSpend === null || place.estimatedSpend === undefined ? (
                  <span className="no-estimate">No price information</span>
                ) : (
                  <>
                    <span className="label">Typical spend (estimated)</span>
                    <span className="amount">≈ €{place.estimatedSpend}</span>
                  </>
                )}
              </div>

              <div className="card-actions">
                {place.mapsUri && (
                  <a className="btn-map" href={place.mapsUri} target="_blank" rel="noopener noreferrer">
                    Open in Maps
                  </a>
                )}
                <button
                  className={`btn-save ${savedPlaces.includes(place.id) ? 'saved' : ''}`}
                  onClick={() => toggleSave(place.id)}
                >
                  {savedPlaces.includes(place.id) ? '✓ Saved' : '❤️ Save'}
                </button>
              </div>
            </div>
          ))
        ) : (
          status !== 'loading' && status !== 'locating' && (
            <div className="no-deals">
              <p>Nothing here fits your remaining budget right now.</p>
              <p>Try another category, or untick the budget filter.</p>
            </div>
          )
        )}
      </div>

      {status === 'live' && (
        <p className="places-footnote">
          Venue data from Google Places. Spend figures are estimates based on Google's price band, not real prices or offers.
        </p>
      )}
    </div>
  );
}

export default SmartSpending;
