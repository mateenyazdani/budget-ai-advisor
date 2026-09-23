import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { attachOffers } from '../lib/matchOffers';
import PinForm from './PinForm';
import { loadWantToTry, saveWantToTry, removeWantToTry } from '../lib/wantToTry';
import { loadVisiblePins } from '../lib/pins';
import { SENTIMENTS } from '../lib/ranking';
import { TOP_LEVEL, categoryById, categoriesIn, topById } from '../lib/categories';
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
    <div className="deal-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="deal-card skeleton">
          <span className="skeleton-block" />
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
        </div>
      ))}
    </div>
  );
}

const SORTS = [
  { id: 'value', label: 'Best value' },
  { id: 'discount', label: 'Biggest discount' },
  { id: 'price', label: 'Cheapest' },
  { id: 'distance', label: 'Closest' },
  { id: 'rating', label: 'Top rated' },
];

// Nulls always sort last, whichever way the column runs. A place with no rating
// should never outrank one with a real 4.8.
function by(getter, direction = 'asc') {
  return (a, b) => {
    const va = getter(a);
    const vb = getter(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return direction === 'asc' ? va - vb : vb - va;
  };
}

function priceOf(item) {
  return item.offer?.priceNow ?? item.estimatedSpend ?? null;
}

function sortItems(items, sort) {
  const copy = [...items];
  if (sort === 'discount') return copy.sort(by((i) => i.offer?.discountPercent, 'desc'));
  if (sort === 'price') return copy.sort(by(priceOf));
  if (sort === 'distance') return copy.sort(by((i) => i.distanceKm));
  if (sort === 'rating') return copy.sort(by((i) => i.rating, 'desc'));

  // Best value: a real, verified discount wins, then having an offer at all,
  // then price, then rating.
  return copy.sort((a, b) => {
    const da = a.offer?.discountPercent ?? -1;
    const db = b.offer?.discountPercent ?? -1;
    if (da !== db) return db - da;
    if (Boolean(b.offer) !== Boolean(a.offer)) return b.offer ? 1 : -1;
    const pa = priceOf(a);
    const pb = priceOf(b);
    if (pa != null && pb != null && pa !== pb) return pa - pb;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
}

// Leaflet's default marker is a PNG the bundler rewrites and then cannot find,
// so the marker is drawn as an element carrying the category's own emoji.
function resultIcon(emoji) {
  return L.divIcon({
    className: 'result-pin-wrap',
    html: `<span class="result-pin">${emoji}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function ResultsMap({ items, icon, centre }) {
  const pinned = items.filter((i) => i.lat != null && i.lng != null);
  if (pinned.length === 0) {
    return (
      <p className="results-status">
        None of these carry a location, so there is nothing to put on a map. Online-only offers
        live in the list.
      </p>
    );
  }
  const middle = centre || [pinned[0].lat, pinned[0].lng];

  return (
    <div className="results-map">
      <MapContainer center={middle} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((p) => (
          <Marker key={p.key} position={[p.lat, p.lng]} icon={resultIcon(icon)}>
            <Popup>
              <strong>{p.name}</strong>
              {p.rating != null && <div>⭐ {p.rating}</div>}
              {p.distanceKm != null && <div>{p.distanceKm} km away</div>}
              {p.mapsUri && (
                <a href={p.mapsUri} target="_blank" rel="noopener noreferrer">Open in Maps</a>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function DealCard({ item, icon, typical, onPin, onToggleWant, wanted }) {
  const { offer } = item;
  const showPair = offer?.priceBefore != null && offer?.priceNow != null;

  const badges = (
    <>
      {offer?.discountPercent != null && (
        <span className="deal-burn">🔥 {offer.discountPercent}% OFF</span>
      )}
      {item.withinBudget === true && offer?.discountPercent == null && (
        <span className="deal-fits">🎯 Fits your budget</span>
      )}
    </>
  );

  return (
    <article className={`deal-card ${offer ? 'has-offer' : ''}`}>
      {item.photoRef ? (
        // A real photo of the actual place, not an emoji — fetched through
        // /api/photo so the Google key stays server-side. The badges move
        // onto the image itself once there's a photo to sit on.
        <div className="deal-photo-wrap">
          <img
            className="deal-photo"
            src={`/api/photo?ref=${encodeURIComponent(item.photoRef)}&w=800`}
            alt=""
            loading="lazy"
          />
          <span className="deal-photo-emoji" aria-hidden="true">{icon}</span>
          <div className="deal-photo-badges" aria-hidden="true">{badges}</div>
        </div>
      ) : (
        <div className="deal-top" aria-hidden="true">
          <span className="deal-emoji">{icon}</span>
          {badges}
        </div>
      )}

      <h3>{item.name}</h3>

      {showPair ? (
        <p className="deal-price">
          <span className="was">€{offer.priceBefore}</span>
          <span className="arrow" aria-hidden="true">→</span>
          <span className="now">€{offer.priceNow}</span>
          {offer.unit && <span className="unit">{offer.unit}</span>}
        </p>
      ) : offer?.priceNow != null ? (
        <p className="deal-price">
          <span className="now">€{offer.priceNow}</span>
          {offer.unit && <span className="unit">{offer.unit}</span>}
        </p>
      ) : item.estimatedSpend != null ? (
        <p className="deal-price estimate">
          <span className="now soft">about €{item.estimatedSpend}</span>
          <span className="unit">
            from Google's price band{typical?.unit ? `, ${typical.unit}` : ''} — not a quoted price
          </span>
        </p>
      ) : typical ? (
        // Google prices almost nothing outside food and shops, which left a
        // padel court or a dentist showing no cost at all.
        <p className="deal-price estimate">
          <span className="now soft">€{typical.low}–{typical.high}</span>
          <span className="unit">
            typical for this kind of place{typical.unit ? `, ${typical.unit}` : ''} — not this
            venue's price
          </span>
        </p>
      ) : null}

      {offer && <p className="deal-offer">{offer.offer}</p>}
      {offer?.validity && <p className="deal-validity">{offer.validity}</p>}

      {item.verdict && (item.verdict.mine || item.verdict.friends.length > 0) && (
        <p className="friend-verdict">
          {item.verdict.mine && (
            <span className="verdict-chip mine">
              You: {Number(item.verdict.mine.score ?? item.verdict.mine.rating * 2).toFixed(1)}/10
            </span>
          )}
          {item.verdict.friends.length > 0 && (
            <span className="verdict-chip friends">
              {SENTIMENTS.find((s) => s.id === item.verdict.friends[0].sentiment)?.emoji || '📍'}{' '}
              {item.verdict.friends.length === 1
                ? `${item.verdict.friends[0].author?.username || 'A friend'} rated it ${Number(item.verdict.friends[0].score ?? item.verdict.friends[0].rating * 2).toFixed(1)}/10`
                : `${item.verdict.friends.length} friends, avg ${(
                    item.verdict.friends.reduce((sum, p) => sum + Number(p.score ?? p.rating * 2), 0) /
                    item.verdict.friends.length
                  ).toFixed(1)}/10`}
            </span>
          )}
        </p>
      )}

      <div className="deal-facts">
        {item.rating != null && (
          <span>⭐ {item.rating}{item.ratingCount ? ` (${item.ratingCount})` : ''}</span>
        )}
        {item.priceLabel && !offer && <span>{item.priceLabel}</span>}
        {item.openNow === true && <span className="open">Open now</span>}
      </div>

      <p className="deal-where">
        {item.distanceKm != null
          ? `${item.distanceKm} km away`
          : item.address || 'Online — available anywhere'}
      </p>

      <div className="deal-actions">
        {offer?.sourceUrl && (
          <a className="deal-cta" href={offer.sourceUrl} target="_blank" rel="noopener noreferrer">
            See the deal
          </a>
        )}
        {/* A real, dialable number from Google — not a booking API, which
            would need a partnership with TheFork/OpenTable this app does not
            have. Calling is the one booking path that needs no partner. It
            becomes the main action when there is no deal link to be one. */}
        {item.phone && (
          <a className={offer?.sourceUrl ? 'deal-link' : 'deal-cta'} href={`tel:${item.phone}`}>
            📞 Call to book
          </a>
        )}
        {item.website && (
          <a className="deal-link" href={item.website} target="_blank" rel="noopener noreferrer">
            Website
          </a>
        )}
        {item.mapsUri && (
          <a className="deal-link" href={item.mapsUri} target="_blank" rel="noopener noreferrer">
            Map
          </a>
        )}
        {/* Only a place you can stand in can be pinned or bookmarked. An online
            SIM deal has no coordinates and would land in the sea off Africa. */}
        {onToggleWant && item.lat != null && !wanted && (
          <button type="button" className="deal-link" onClick={() => onToggleWant(item)}>
            🔖 Want to try
          </button>
        )}
        {onToggleWant && item.lat != null && wanted && (
          <button type="button" className="deal-link want-on" onClick={() => onToggleWant(item)}>
            🔖 Saved
          </button>
        )}
        {onPin && item.lat != null && (
          <button type="button" className="deal-link pin-it" onClick={() => onPin(item)}>
            I've been
          </button>
        )}
      </div>
    </article>
  );
}

function Discover({ budgetRemaining, session }) {
  // The place being rated, if the pin sheet is open over the results.
  const [pinning, setPinning] = useState(null);
  const [wantIds, setWantIds] = useState(() => new Set());
  const [visiblePins, setVisiblePins] = useState([]);
  const [city, setCity] = useState(() => localStorage.getItem('userCity') || 'Madrid');
  const [cityDraft, setCityDraft] = useState(city);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(true);

  const [top, setTop] = useState('EAT');
  const [category, setCategory] = useState('Dining');

  // Declared early: toggleWant below closes over it, and a const referenced
  // before its declaration in the same scope is a crash, not a stale value.
  const current = category ? categoryById(category) : null;
  const [activeQuery, setActiveQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [offers, setOffers] = useState([]);
  const [placesState, setPlacesState] = useState('idle');
  const [offersState, setOffersState] = useState('idle');
  const [locError, setLocError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [offersError, setOffersError] = useState('');
  const [noPriceData, setNoPriceData] = useState(false);
  const [typical, setTypical] = useState(null);
  const [query, setQuery] = useState('');

  // "How much do you want to spend" is the product now, not a background
  // filter — it starts unset (Any) so picking an amount is a deliberate act,
  // not something quietly narrowing results before anyone asked it to.
  const [budget, setBudget] = useState(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [goodOnly, setGoodOnly] = useState(true);
  const [sort, setSort] = useState('value');
  const [view, setView] = useState('list');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // A slow search that has been abandoned must not overwrite a newer one.
  const runId = useRef(0);
  const resultsRef = useRef(null);

  const askForLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      setLocError('This browser cannot share a location, so results cover the city below.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(pos.coords.accuracy ?? null);
        setLocError('');
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        // Saying nothing here made the button look broken: you pressed it and
        // the page carried on exactly as before.
        setLocError(
          err.code === err.PERMISSION_DENIED
            ? 'Your browser is blocking location for this site.'
            : err.code === err.TIMEOUT
              ? 'Finding you took too long. Try again, or set the city by hand.'
              : 'Your device could not give a location just now. Try again, or set the city by hand.'
        );
      },
      // Street-level matters here: a 2 km fix would put the wrong restaurants
      // at the top of a list sorted by distance.
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => { askForLocation(); }, [askForLocation]);

  useEffect(() => {
    if (!session) { setWantIds(new Set()); return; }
    loadWantToTry().then((rows) => setWantIds(new Set(rows.map((r) => r.place_id))));
  }, [session]);

  useEffect(() => {
    if (!session) { setVisiblePins([]); return; }
    loadVisiblePins().then(setVisiblePins);
  }, [session]);

  const toggleWant = useCallback(async (item) => {
    const already = wantIds.has(item.id);
    // Optimistic: a bookmark toggle should feel instant, and a failed write
    // just gets silently corrected back on the next load.
    setWantIds((prev) => {
      const next = new Set(prev);
      already ? next.delete(item.id) : next.add(item.id);
      return next;
    });
    if (already) {
      await removeWantToTry(item.id);
    } else {
      await saveWantToTry({
        id: item.id,
        name: item.name,
        category: current?.id,
        address: item.address,
        lat: item.lat,
        lng: item.lng,
        countryCode: item.countryCode,
      });
    }
  }, [wantIds, current]);

  // A denied permission cannot be re-prompted by script, so the button must
  // stop pretending it can and explain where the switch actually is.
  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let status;
    const sync = () => setBlocked(status.state === 'denied');
    navigator.permissions.query({ name: 'geolocation' }).then((s) => {
      status = s;
      sync();
      s.onchange = sync;
    }).catch(() => {});
    return () => { if (status) status.onchange = null; };
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
    setOffersError('');

    // A SIM card, broadband or insurance has no premises to visit, so asking
    // Google for nearby shops would only add noise and a wait. A typed name
    // has no such category to check, and Google is exactly what "where is
    // this place" needs — it was skipped entirely before, so a name search
    // only ever reached the deals search and never a single real venue.
    if ((cat && cat.type === 'place') || (!cat && freeText)) {
      setPlacesState('loading');
      // Without location permission we still know the city, which is enough to
      // find the venues — just not to measure how far away they are.
      const params = new URLSearchParams(
        coords
          ? { lat: String(coords.lat), lng: String(coords.lng) }
          : { city }
      );
      if (freeText) {
        // A place found by name is being looked up specifically, not browsed
        // — filtering it out for being pricey would just hide the thing that
        // was searched for.
        params.set('query', freeText);
      } else {
        params.set('category', catId);
        if (budget) params.set('budget', String(budget));
        if (goodOnly) params.set('minRating', '4');
      }

      fetch(`/api/places?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (runId.current !== run) return;
          setPlaces(d.places || []);
          setNoPriceData(d.priceData === false);
          setTypical(d.typical || null);
          setPlacesState(d.configured === false ? 'unconfigured' : 'done');
        })
        .catch(() => { if (runId.current === run) setPlacesState('error'); });
    } else {
      setPlacesState('skipped');
      setNoPriceData(false);
      setTypical(null);
    }

    // A deal that fit no budget and one found for "under €10" are different
    // answers to different questions, so they cannot share a cache entry.
    const key = `${freeText ? `q:${freeText.toLowerCase()}` : catId}${budget ? `|<=${budget}` : ''}`;
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
    if (budget) dealParams.set('budget', String(budget));

    try {
      const response = await fetch(`/api/deals?${dealParams}`);
      const data = await response.json().catch(() => null);
      if (runId.current !== run) return;
      if (!data || !response.ok) {
        setOffersState('error');
        setOffersError(data?.error || '');
        return;
      }
      const deals = data.deals || [];
      writeOffers(city, key, deals);
      setOffers(deals);
      setOffersState('done');
    } catch {
      if (runId.current === run) setOffersState('error');
    }
  }, [coords, city, budget, goodOnly]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current || locating) return;
    started.current = true;
    search(category, '');
  }, [locating, category, search]);

  const pick = (catId) => {
    setQuery('');
    search(catId, '');
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const openTop = (topId) => {
    setTop(topId);
    const first = categoriesIn(topId)[0];
    if (first) pick(first.id);
  };

  const applyCity = (e) => {
    e.preventDefault();
    const next = cityDraft.trim();
    if (!next || next === city) return;
    setCity(next);
    localStorage.setItem('userCity', next);
  };

  // A city change, a new location fix or a filter change all invalidate what is
  // on screen, so re-run whatever is open.
  const inputsRef = useRef('');
  useEffect(() => {
    const stamp = `${city}|${budget}|${goodOnly}|${coords ? 'gps' : 'city'}`;
    if (inputsRef.current === '') { inputsRef.current = stamp; return; }
    if (inputsRef.current === stamp) return;
    inputsRef.current = stamp;
    if (category || activeQuery) search(category, activeQuery);
  }, [city, budget, goodOnly, coords, category, activeQuery, search]);

  const icon = current?.icon || '🏷️';
  const { places: merged, unmatched } = attachOffers(places, offers);

  // Keyed by Google's place id, so a venue card can be matched against the
  // pins your friends left on this exact place — separate from your own,
  // since "you rated this" and "2 friends rated this" read differently.
  const verdictsByPlace = new Map();
  for (const pin of visiblePins) {
    if (!pin.place_id) continue;
    const bucket = verdictsByPlace.get(pin.place_id) || { mine: null, friends: [] };
    if (pin.user_id === session?.user?.id) bucket.mine = pin;
    else bucket.friends.push(pin);
    verdictsByPlace.set(pin.place_id, bucket);
  }

  // Venues and venue-less offers are the same thing to someone browsing, so
  // they sort together rather than sitting in two separate lists.
  const items = sortItems(
    [
      ...merged.map((p) => ({ ...p, key: p.id, verdict: verdictsByPlace.get(p.id) || null })),
      ...unmatched.map((d, i) => ({
        key: `offer-${d.merchant}-${i}`,
        name: d.merchant,
        address: null,
        rating: null,
        distanceKm: null,
        estimatedSpend: null,
        offer: d,
      })),
    ],
    sort
  );

  const offersLoading = offersState === 'loading';
  const placesLoading = placesState === 'loading';
  const showing = category || activeQuery;

  return (
    <div className="discover">
      <header className="discover-head">
        <h1>{topById(top)?.headline || 'Spend less on all of it.'}</h1>
        <p>
          Every good place near you, ranked by what it actually costs.
          {typeof budgetRemaining === 'number' && budgetRemaining > 0 && (
            <> You have <strong>€{budgetRemaining.toFixed(0)}</strong> spare this month.</>
          )}
        </p>
      </header>

      <nav className="top-rail" aria-label="What are you after">
        {TOP_LEVEL.map((t) => (
          <button
            key={t.id}
            className={`rail-item ${top === t.id ? 'active' : ''}`}
            onClick={() => openTop(t.id)}
          >
            <span className="rail-icon" aria-hidden="true">{t.icon}</span>
            <span className="rail-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* The headline interaction: pick an amount, see what actually fits it,
          near you, right now. Everything else on the page is secondary to
          this — it starts unset so choosing one is a deliberate step. */}
      <div className="budget-bar">
        <span className="budget-label">How much do you want to spend?</span>
        <div className="budget-chips">
          {[10, 15, 20, 30].map((v) => (
            <button
              key={v}
              type="button"
              className={`budget-chip ${budget === v ? 'on' : ''}`}
              onClick={() => { setBudget((b) => (b === v ? null : v)); setBudgetInput(''); }}
            >
              €{v}
            </button>
          ))}
          <form
            className="budget-custom"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.round(Number(budgetInput));
              if (Number.isFinite(n) && n > 0) setBudget(n);
            }}
          >
            <span className="budget-custom-sign" aria-hidden="true">€</span>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="Custom"
              aria-label="Custom budget in euros"
            />
          </form>
          {budget != null && (
            <button
              type="button"
              className="budget-chip budget-clear"
              onClick={() => { setBudget(null); setBudgetInput(''); }}
            >
              Any price
            </button>
          )}
        </div>
      </div>

      <form
        className="discover-search"
        onSubmit={(e) => { e.preventDefault(); if (query.trim()) { setTop(null); search(null, query.trim()); } }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or search anything — sim card, gym membership, car insurance…"
          aria-label="Search for anything"
        />
        <button type="submit">Search</button>
      </form>

      <div className="discover-where">
        <form className="discover-city" onSubmit={applyCity}>
          <span className="city-pin" aria-hidden="true">📍</span>
          <input value={cityDraft} onChange={(e) => setCityDraft(e.target.value)} aria-label="Your city" />
          <button type="submit">Change</button>
        </form>
        {locating ? (
          <span className="city-status">finding you…</span>
        ) : coords ? (
          <span className="city-status located">
            Using your location{accuracy != null && ` · accurate to about ${Math.round(accuracy)} m`}
          </span>
        ) : (
          <button type="button" className="linklike" onClick={askForLocation}>
            Use my location instead
          </button>
        )}
      </div>

      {(locError || (blocked && !coords)) && (
        <div className="discover-notice">
          <p>{locError || 'Your browser is blocking location for this site.'}</p>
          {blocked && (
            <p className="notice-how">
              A blocked site cannot be asked again from the page, so the switch is in the browser:
              click the icon at the left of the address bar (a slider, or “View site information”),
              set <strong>Location</strong> to <strong>Allow</strong>, then reload. On Safari it is
              Settings → Websites → Location. Until then everything still works from the city box —
              you just lose distances.
            </p>
          )}
        </div>
      )}

      {top && (
        <div className="subcats">
          {categoriesIn(top).map((c) => (
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
      )}

      <div ref={resultsRef} />

      {showing && (
        <section className="results">
          <div className="results-bar">
            <h2>
              {items.length > 0 && <span className="count">{items.length}</span>}
              {activeQuery ? `“${activeQuery}”` : current?.label}
              {current?.type === 'offer' ? ' — best offers' : coords ? ' near you' : ` in ${city}`}
              {budget != null && <span className="budget-tag">under €{budget}</span>}
            </h2>

            <div className="bar-controls">
              <div className="view-toggle" role="group" aria-label="View">
                <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
                <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>Map</button>
              </div>

              <label className="sort-select">
                <span className="sr-only">Order</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.id === 'distance' && !coords}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className={`bar-btn ${filtersOpen || !goodOnly ? 'on' : ''}`}
                onClick={() => setFiltersOpen((o) => !o)}
              >
                Filters
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="filters">
              <button
                className={`filter-pill lone ${goodOnly ? 'on' : ''}`}
                onClick={() => setGoodOnly((g) => !g)}
              >
                ⭐ 4.0+ only
              </button>
            </div>
          )}

          {noPriceData && budget && current?.type === 'place' && (
            <p className="filter-note">
              Google publishes no prices for {current.label.toLowerCase()}, so €{budget} cannot be
              checked against them here. These are sorted by rating instead.
            </p>
          )}

          {placesLoading && items.length === 0 && <SkeletonCards count={4} />}

          {items.length > 0 && view === 'map' && (
            <ResultsMap
              items={items}
              icon={icon}
              centre={coords ? [coords.lat, coords.lng] : null}
            />
          )}

          {items.length > 0 && view === 'list' && (
            <div className="deal-grid">
              {items.map((item) => (
                <DealCard
                  key={item.key}
                  item={item}
                  icon={icon}
                  typical={typical}
                  onPin={session ? setPinning : null}
                  onToggleWant={session ? toggleWant : null}
                  wanted={wantIds.has(item.id)}
                />
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

          {!offersLoading && !placesLoading && items.length === 0 && offersState !== 'error' && (
            <p className="results-status">
              Nothing matched in {city}. Try “Any price”, or turn off the 4.0+ filter — offers are
              only shown when they can be verified on a real page, so an empty result means nothing
              could be, not that nothing exists.
            </p>
          )}

          {offersState === 'error' && (
            <p className="results-status">
              {offersError || 'The offer search could not finish.'}
              {items.length > 0 && ' The places above are still real.'}{' '}
              <button className="linklike" onClick={() => search(category, activeQuery)}>Try again</button>
            </p>
          )}
        </section>
      )}


      {pinning && (
        <PinForm
          place={{ ...pinning, city }}
          category={category}
          session={session}
          onClose={() => setPinning(null)}
          onSaved={() => {
            // Having actually been supersedes wanting to go.
            if (wantIds.has(pinning.id)) {
              setWantIds((prev) => { const next = new Set(prev); next.delete(pinning.id); return next; });
              removeWantToTry(pinning.id);
            }
          }}
        />
      )}
    </div>
  );
}

export default Discover;
