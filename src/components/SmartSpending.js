import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SmartSpending.css';

const CATEGORIES = ['All', 'Dining', 'Groceries', 'Coffee', 'Padel', 'Gym', 'Shopping'];

// Shown only when live results are unavailable, and labelled as samples in the UI.
const SAMPLE_PLACES = [
  { id: 's1', name: 'Casa Lucio', emoji: '🍽️', rating: 4.3, ratingCount: 5200, priceLabel: '€€€', estimatedSpend: 45, distanceKm: 1.2, openNow: null, address: 'Calle Cava Baja, Madrid' },
  { id: 's2', name: 'Mercadona', emoji: '🛒', rating: 4.1, ratingCount: 890, priceLabel: '€', estimatedSpend: 20, distanceKm: 0.6, openNow: null, address: 'Calle Fuencarral, Madrid' },
  { id: 's3', name: 'Toma Café', emoji: '☕', rating: 4.5, ratingCount: 1400, priceLabel: '€', estimatedSpend: 3, distanceKm: 0.9, openNow: null, address: 'Calle Palma, Madrid' },
  { id: 's4', name: 'Padel Indoor Madrid', emoji: '🎾', rating: 4.4, ratingCount: 310, priceLabel: '€€', estimatedSpend: 28, distanceKm: 3.1, openNow: null, address: 'Retiro, Madrid' },
];

function grouponUrl(city) {
  const slug = city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `https://www.groupon.es/browse/${slug}`;
}

function SmartSpending({ budgetRemaining }) {
  const navigate = useNavigate();
  const [view, setView] = useState('places');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [budgetOnly, setBudgetOnly] = useState(true);

  const [places, setPlaces] = useState([]);
  const [status, setStatus] = useState('locating');
  const [notice, setNotice] = useState('');
  const [coords, setCoords] = useState(null);

  const [city, setCity] = useState(() => localStorage.getItem('userCity') || 'Madrid');
  const [cityInput, setCityInput] = useState(() => localStorage.getItem('userCity') || 'Madrid');
  const [dealQuery, setDealQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [deals, setDeals] = useState([]);
  const [dealsState, setDealsState] = useState('idle');
  const [dealsMessage, setDealsMessage] = useState('');

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
    } catch {
      setStatus('sample');
      setNotice('Could not load nearby venues, so these are samples.');
    }
  }, [coords, selectedCategory]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const loadDeals = useCallback(async () => {
    if (!city) return;
    setDealsState('loading');
    setDealsMessage('');
    try {
      const params = new URLSearchParams({ city });
      if (activeQuery) params.set('query', activeQuery);
      else params.set('category', selectedCategory);
      const response = await fetch(`/api/deals?${params}`);

      // Running under `npm start` there is no API server, so the dev server
      // answers with index.html rather than JSON.
      const data = await response.json().catch(() => null);
      if (!data) {
        setDealsState('error');
        setDealsMessage('Deal search is not available here. It needs the API running — use `vercel dev` locally, or the deployed site.');
        return;
      }

      if (!response.ok) throw new Error(data.error || 'Could not search for deals.');
      if (data.configured === false) {
        setDealsState('unconfigured');
        setDealsMessage(data.message || 'Live deals are not configured.');
        return;
      }
      setDeals(data.deals || []);
      setDealsState('done');
    } catch (error) {
      setDealsState('error');
      setDealsMessage(error.message);
    }
  }, [city, selectedCategory, activeQuery]);

  useEffect(() => {
    if (view === 'deals') loadDeals();
  }, [view, loadDeals]);

  const applyCity = (e) => {
    e.preventDefault();
    const next = cityInput.trim();
    if (!next) return;
    setCity(next);
    localStorage.setItem('userCity', next);
  };

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
        <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>
        <h2>Smart Spending</h2>
        <p className="spending-sub">Ways to spend less of the money you have left.</p>
        <div className="budget-info">
          You have <strong>€{budgetRemaining.toFixed(2)}</strong> left this month
        </div>
      </div>

      <div className="view-tabs">
        <button className={view === 'places' ? 'active' : ''} onClick={() => setView('places')}>
          Places near me
        </button>
        <button className={view === 'deals' ? 'active' : ''} onClick={() => setView('deals')}>
          Live deals
        </button>
      </div>

      <div className="category-filter" hidden={view === 'deals' && Boolean(activeQuery)}>
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

      {view === 'places' ? (
        <>
          {status !== 'live' && notice && (
            <div className="places-notice">
              <strong>Sample data.</strong> {notice}
            </div>
          )}

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
                      {savedPlaces.includes(place.id) ? '✓ Saved' : '♥ Save'}
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
        </>
      ) : (
        <>
          <form
            className="deal-search"
            onSubmit={(e) => { e.preventDefault(); setActiveQuery(dealQuery.trim()); }}
          >
            <label htmlFor="dealq">What are you looking for?</label>
            <div className="city-row">
              <input
                id="dealq"
                value={dealQuery}
                onChange={(e) => setDealQuery(e.target.value)}
                placeholder="sim card, padel court, haircut, gym…"
                maxLength={60}
              />
              <button type="submit">Search</button>
            </div>
            {activeQuery && (
              <button
                type="button"
                className="clear-query"
                onClick={() => { setDealQuery(''); setActiveQuery(''); }}
              >
                Clear “{activeQuery}” and use the categories instead
              </button>
            )}
          </form>

          <form className="city-form" onSubmit={applyCity}>
            <label htmlFor="city">Your city</label>
            <div className="city-row">
              <input
                id="city"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Madrid"
                maxLength={60}
              />
              <button type="submit">Search</button>
            </div>
          </form>

          {dealsState === 'loading' && (
            <div className="places-status">Searching the web for current offers in {city}… this takes a few seconds.</div>
          )}

          {(dealsState === 'unconfigured' || dealsState === 'error') && (
            <div className="places-notice">{dealsMessage}</div>
          )}

          {dealsState === 'done' && deals.length === 0 && (
            <div className="places-notice">
              Nothing current found for {activeQuery ? `“${activeQuery}”` : 'this category'} in {city}.
              Rather than show you invented discounts, it shows nothing.
            </div>
          )}

          <div className="deals-grid">
            {deals.map((deal, i) => (
              <div key={`${deal.merchant}-${i}`} className="deal-card">
                <h4>{deal.merchant}</h4>
                <p className="deal-offer">{deal.offer}</p>
                {deal.detail && <p className="deal-description">{deal.detail}</p>}
                {deal.validity && <p className="deal-validity">⏰ {deal.validity}</p>}

                <div className="card-actions">
                  {deal.sourceUrl ? (
                    <a className="btn-map" href={deal.sourceUrl} target="_blank" rel="noopener noreferrer">
                      Check on {deal.sourceName || 'source'}
                    </a>
                  ) : (
                    <span className="unverified">No source link — treat with caution</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="deals-footer">
            <a className="btn-groupon" href={grouponUrl(city)} target="_blank" rel="noopener noreferrer">
              Browse Groupon {city}
            </a>
            <p className="places-footnote">
              These are found by searching the web, so always check the source link before relying on an
              offer — it may have changed or expired.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default SmartSpending;
