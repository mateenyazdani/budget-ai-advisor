import React, { useState, useEffect, useCallback } from 'react';
import { attachOffers } from '../lib/matchOffers';
import '../styles/Discover.css';

// Ordered by how often people actually look for them, not alphabetically.
const CATEGORIES = [
  { id: 'Dining', label: 'Eat out', icon: '🍽️', blurb: 'Cheap eats and offers' },
  { id: 'Padel', label: 'Padel', icon: '🎾', blurb: 'Courts and bookings' },
  { id: 'Gym', label: 'Gym', icon: '💪', blurb: 'Passes and memberships' },
  { id: 'Groceries', label: 'Groceries', icon: '🛒', blurb: 'Supermarkets nearby' },
  { id: 'Coffee', label: 'Coffee', icon: '☕', blurb: 'Cafés and breakfast' },
  { id: 'Tennis', label: 'Tennis', icon: '🎾', blurb: 'Clubs and courts' },
  { id: 'Cinema', label: 'Cinema', icon: '🎬', blurb: 'Screens and ticket deals' },
  { id: 'Nightlife', label: 'Going out', icon: '🍸', blurb: 'Bars and clubs' },
  { id: 'Beauty', label: 'Hair & beauty', icon: '💈', blurb: 'Salons and barbers' },
  { id: 'Shopping', label: 'Shopping', icon: '👕', blurb: 'Clothes and stores' },
  { id: 'Travel', label: 'Travel', icon: '✈️', blurb: 'Stays and trips' },
];

function Discover({ budgetRemaining }) {
  const [city, setCity] = useState(() => localStorage.getItem('userCity') || 'Madrid');
  const [cityDraft, setCityDraft] = useState(city);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(true);

  const [category, setCategory] = useState(null);
  const [places, setPlaces] = useState([]);
  const [offers, setOffers] = useState([]);
  const [placesState, setPlacesState] = useState('idle');
  const [offersState, setOffersState] = useState('idle');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setNotice('Location is off, so results are for the city below rather than exactly where you are.');
        setLocating(false);
      },
      { timeout: 10000 }
    );
  }, []);

  // Venues and offers come from different places and take very different
  // amounts of time, so they load independently rather than one blocking the
  // other.
  const search = useCallback(async (cat, freeText) => {
    setCategory(cat);
    setPlaces([]);
    setOffers([]);

    if (coords && cat) {
      setPlacesState('loading');
      const params = new URLSearchParams({
        lat: String(coords.lat), lng: String(coords.lng), category: cat,
      });
      fetch(`/api/places?${params}`)
        .then((r) => r.json())
        .then((d) => {
          setPlaces(d.places || []);
          setPlacesState(d.configured === false ? 'unconfigured' : 'done');
        })
        .catch(() => setPlacesState('error'));
    } else {
      setPlacesState('nolocation');
    }

    setOffersState('loading');
    const dealParams = new URLSearchParams({ city });
    if (freeText) dealParams.set('query', freeText);
    else dealParams.set('category', cat);

    try {
      const response = await fetch(`/api/deals?${dealParams}`);
      const data = await response.json().catch(() => null);
      if (!data || !response.ok) {
        setOffersState('error');
        return;
      }
      setOffers(data.deals || []);
      setOffersState('done');
    } catch {
      setOffersState('error');
    }
  }, [coords, city]);

  const applyCity = (e) => {
    e.preventDefault();
    const next = cityDraft.trim();
    if (!next) return;
    setCity(next);
    localStorage.setItem('userCity', next);
    if (category) search(category, query);
  };

  const { places: merged, unmatched } = attachOffers(places, offers);
  const searching = placesState === 'loading' || offersState === 'loading';

  return (
    <div className="discover">
      <header className="discover-head">
        <h1>What are you after?</h1>
        <p>
          Real places near you, with the offer attached where there is one.
          {typeof budgetRemaining === 'number' && budgetRemaining > 0 && (
            <> You have <strong>€{budgetRemaining.toFixed(0)}</strong> spare this month.</>
          )}
        </p>
      </header>

      <form className="discover-search" onSubmit={(e) => { e.preventDefault(); if (query.trim()) search(null, query.trim()); }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anything — sim card, haircut, climbing…"
          aria-label="Search for anything"
        />
        <button type="submit">Search</button>
      </form>

      <form className="discover-city" onSubmit={applyCity}>
        <span className="city-pin" aria-hidden="true">📍</span>
        <input value={cityDraft} onChange={(e) => setCityDraft(e.target.value)} aria-label="Your city" />
        <button type="submit">Change</button>
        {locating && <span className="city-status">finding you…</span>}
      </form>

      {notice && <p className="discover-notice">{notice}</p>}

      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`category-tile ${category === c.id ? 'active' : ''}`}
            onClick={() => { setQuery(''); search(c.id, ''); }}
          >
            <span className="tile-icon" aria-hidden="true">{c.icon}</span>
            <span className="tile-label">{c.label}</span>
            <span className="tile-blurb">{c.blurb}</span>
          </button>
        ))}
      </div>

      {(category || query) && (
        <section className="results">
          <h2>
            {query ? `“${query}”` : CATEGORIES.find((c) => c.id === category)?.label} in {city}
          </h2>

          {searching && (
            <p className="results-status">
              Looking for places and checking the web for current offers — the offers take up to a minute.
            </p>
          )}

          {merged.length > 0 && (
            <div className="result-grid">
              {merged.map((p) => (
                <article key={p.id} className={`result-card ${p.offer ? 'has-offer' : ''}`}>
                  {p.offer && <span className="offer-flag">Deal found</span>}
                  <h3>{p.name}</h3>
                  {p.address && <p className="result-address">{p.address}</p>}

                  <div className="result-facts">
                    {p.rating != null && <span>⭐ {p.rating}{p.ratingCount ? ` (${p.ratingCount})` : ''}</span>}
                    {p.distanceKm != null && <span>{p.distanceKm} km</span>}
                    {p.priceLabel && <span>{p.priceLabel}</span>}
                    {p.openNow === true && <span className="open">Open now</span>}
                  </div>

                  {p.offer ? (
                    <div className="result-offer">
                      <strong>{p.offer.offer}</strong>
                      {p.offer.validity && <span className="offer-validity">{p.offer.validity}</span>}
                      {p.offer.sourceUrl && (
                        <a href={p.offer.sourceUrl} target="_blank" rel="noopener noreferrer">
                          Check on {p.offer.sourceName || 'source'}
                        </a>
                      )}
                    </div>
                  ) : (
                    p.estimatedSpend != null && (
                      <p className="result-estimate">Typically about €{p.estimatedSpend} — estimated</p>
                    )
                  )}

                  {p.mapsUri && (
                    <a className="result-map" href={p.mapsUri} target="_blank" rel="noopener noreferrer">
                      Open in Maps
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}

          {unmatched.length > 0 && (
            <>
              <h3 className="unmatched-head">Other offers in {city}</h3>
              <p className="unmatched-note">Found on the web but not tied to a place near you.</p>
              <div className="result-grid">
                {unmatched.map((d, i) => (
                  <article key={`${d.merchant}-${i}`} className="result-card offer-only">
                    <h3>{d.merchant}</h3>
                    <div className="result-offer">
                      <strong>{d.offer}</strong>
                      {d.detail && <span className="offer-validity">{d.detail}</span>}
                      {d.sourceUrl && (
                        <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">
                          Check on {d.sourceName || 'source'}
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {!searching && merged.length === 0 && unmatched.length === 0 && (
            <p className="results-status">
              Nothing found for this in {city}. Offers are only shown when they can be verified on a
              real page, so an empty result means nothing could be — not that nothing exists.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default Discover;
