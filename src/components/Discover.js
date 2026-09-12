import React, { useState, useEffect, useCallback, useRef } from 'react';
import { attachOffers } from '../lib/matchOffers';
import { CATEGORIES, GROUPS, categoryById } from '../lib/categories';
import '../styles/Discover.css';

// Looking at one category, moving to another and coming back used to cost a
// second full web search. Offers for a city do not change minute to minute, so
// the answer is kept for the session and the return trip is instant.
const OFFER_TTL_MS = 30 * 60 * 1000;

function storageKey(city, key) {
  return `offers:${city.toLowerCase()}:${key}`;
}

function readOffers(city, key) {
  try {
    const raw = sessionStorage.getItem(storageKey(city, key));
    if (!raw) return null;
    const { at, deals } = JSON.parse(raw);
    return Date.now() - at > OFFER_TTL_MS ? null : deals;
  } catch {
    return null;
  }
}

function writeOffers(city, key, deals) {
  try {
    sessionStorage.setItem(storageKey(city, key), JSON.stringify({ at: Date.now(), deals }));
  } catch {
    // Private browsing or a full quota. The shortcut is lost, nothing else.
  }
}

// A blank panel for 30 seconds reads as broken. A counter reads as working.
function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="elapsed">{seconds}s</span>;
}

function SkeletonCards({ count = 3 }) {
  return (
    <div className="result-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="result-card skeleton">
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
          <span className="skeleton-block" />
        </div>
      ))}
    </div>
  );
}

function Discover({ budgetRemaining }) {
  const [city, setCity] = useState(() => localStorage.getItem('userCity') || 'Madrid');
  const [cityDraft, setCityDraft] = useState(city);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(true);

  const [group, setGroup] = useState('All');
  const [category, setCategory] = useState(null);
  const [activeQuery, setActiveQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [offers, setOffers] = useState([]);
  const [placesState, setPlacesState] = useState('idle');
  const [offersState, setOffersState] = useState('idle');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  // A slow search that has been abandoned must not overwrite a newer one.
  const runId = useRef(0);
  const resultsRef = useRef(null);

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

  // Venues and offers come from different services and take very different
  // amounts of time — about a second against half a minute — so they load
  // independently rather than one blocking the other.
  const search = useCallback(async (catId, freeText) => {
    const run = (runId.current += 1);
    const cat = catId ? categoryById(catId) : null;

    setCategory(catId);
    setActiveQuery(freeText || '');
    setPlaces([]);
    setOffers([]);

    // A SIM card, broadband or insurance has no premises to visit, so asking
    // Google for nearby shops would only add noise and a wait.
    if (cat && cat.type === 'place' && coords) {
      setPlacesState('loading');
      const params = new URLSearchParams({
        lat: String(coords.lat), lng: String(coords.lng), category: catId,
      });
      fetch(`/api/places?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (runId.current !== run) return;
          setPlaces(d.places || []);
          setPlacesState(d.configured === false ? 'unconfigured' : 'done');
        })
        .catch(() => { if (runId.current === run) setPlacesState('error'); });
    } else if (cat && cat.type === 'place') {
      setPlacesState('nolocation');
    } else {
      setPlacesState('skipped');
    }

    const key = freeText ? `q:${freeText.toLowerCase()}` : catId;
    const cachedOffers = readOffers(city, key);
    if (cachedOffers) {
      setOffers(cachedOffers);
      setOffersState('done');
      return;
    }

    setOffersState('loading');
    const dealParams = new URLSearchParams({ city });
    if (freeText) dealParams.set('query', freeText);
    else dealParams.set('category', catId);

    try {
      const response = await fetch(`/api/deals?${dealParams}`);
      const data = await response.json().catch(() => null);
      if (runId.current !== run) return;
      if (!data || !response.ok) {
        setOffersState('error');
        setNotice(data?.error || '');
        return;
      }
      const deals = data.deals || [];
      writeOffers(city, key, deals);
      setOffers(deals);
      setOffersState('done');
    } catch {
      if (runId.current === run) setOffersState('error');
    }
  }, [coords, city]);

  const pick = (catId) => {
    setQuery('');
    search(catId, '');
    // The grid is long now, so the results would otherwise open off-screen.
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const applyCity = (e) => {
    e.preventDefault();
    const next = cityDraft.trim();
    if (!next || next === city) return;
    setCity(next);
    localStorage.setItem('userCity', next);
  };

  // A city change invalidates everything on screen, so re-run whatever is open.
  const cityRef = useRef(city);
  useEffect(() => {
    if (cityRef.current === city) return;
    cityRef.current = city;
    if (category || activeQuery) search(category, activeQuery);
  }, [city, category, activeQuery, search]);

  const current = category ? categoryById(category) : null;
  const showing = group === 'All' ? GROUPS : [group];
  const { places: merged, unmatched } = attachOffers(places, offers);
  const offersLoading = offersState === 'loading';
  const placesLoading = placesState === 'loading';
  const nothingAtAll =
    !offersLoading && !placesLoading && merged.length === 0 && unmatched.length === 0;

  return (
    <div className="discover">
      <header className="discover-head">
        <h1>What are you after?</h1>
        <p>
          Pick anything below and we go looking for the real, current offer — nearby where there is
          a place to go, nationwide where there is not.
          {typeof budgetRemaining === 'number' && budgetRemaining > 0 && (
            <> You have <strong>€{budgetRemaining.toFixed(0)}</strong> spare this month.</>
          )}
        </p>
      </header>

      <form
        className="discover-search"
        onSubmit={(e) => { e.preventDefault(); if (query.trim()) { search(null, query.trim()); } }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anything — sim card, gym membership, car insurance…"
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

      <nav className="group-tabs" aria-label="Category groups">
        {['All', ...GROUPS].map((g) => (
          <button
            key={g}
            className={`group-tab ${group === g ? 'active' : ''}`}
            onClick={() => setGroup(g)}
          >
            {g}
          </button>
        ))}
      </nav>

      {showing.map((g) => (
        <section key={g} className="category-block">
          {group === 'All' && <h2 className="category-block-head">{g}</h2>}
          <div className="category-grid">
            {CATEGORIES.filter((c) => c.group === g).map((c) => (
              <button
                key={c.id}
                className={`category-chip ${category === c.id ? 'active' : ''}`}
                onClick={() => pick(c.id)}
              >
                <span className="chip-icon" aria-hidden="true">{c.icon}</span>
                <span className="chip-label">{c.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <div ref={resultsRef} />

      {(category || activeQuery) && (
        <section className="results">
          <h2>
            {activeQuery ? `“${activeQuery}”` : current?.label}
            {current?.type === 'offer' ? ' — best offers' : ` in ${city}`}
          </h2>

          {placesLoading && merged.length === 0 && <SkeletonCards count={3} />}

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

          {offersLoading && (
            <>
              <p className="results-status searching">
                <span className="pulse" aria-hidden="true" />
                Reading current offer pages for this — usually well under a minute. <Elapsed />
              </p>
              <SkeletonCards count={current?.type === 'offer' ? 4 : 2} />
            </>
          )}

          {unmatched.length > 0 && (
            <>
              {merged.length > 0 && (
                <>
                  <h3 className="unmatched-head">Other offers in {city}</h3>
                  <p className="unmatched-note">Found on the web but not tied to a place near you.</p>
                </>
              )}
              <div className="result-grid">
                {unmatched.map((d, i) => (
                  <article key={`${d.merchant}-${i}`} className="result-card offer-only">
                    <h3>{d.merchant}</h3>
                    <div className="result-offer">
                      <strong>{d.offer}</strong>
                      {d.detail && <span className="offer-detail">{d.detail}</span>}
                      {d.validity && <span className="offer-validity">{d.validity}</span>}
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

          {nothingAtAll && offersState !== 'error' && (
            <p className="results-status">
              Nothing found for this in {city}. Offers are only shown when they can be verified on a
              real page, so an empty result means nothing could be — not that nothing exists.
            </p>
          )}

          {offersState === 'error' && (
            <p className="results-status">
              The offer search could not finish.
              {merged.length > 0 && ' The places above are still real.'}{' '}
              <button className="linklike" onClick={() => search(category, activeQuery)}>Try again</button>
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default Discover;
