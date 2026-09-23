import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { loadVisiblePins, groupByCountry, averageRating } from '../lib/pins';
import { categoryById } from '../lib/categories';
import '../styles/WorldMap.css';

// Below this, one marker per country; above it, the places themselves. Five is
// roughly where a country stops fitting on the screen, which is also the moment
// a single bubble stops being a useful answer.
const PLACE_ZOOM = 5;

// Leaflet's default marker is a PNG resolved relative to the CSS, which a
// bundler rewrites and then fails to find. Drawing the marker as an element
// sidesteps that entirely, and lets a pin carry its own emoji.
function placeIcon(emoji, rating) {
  return L.divIcon({
    className: 'pin-icon-wrap',
    html: `<span class="pin-icon"><span class="pin-emoji">${emoji}</span><span class="pin-rating">${rating}</span></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  });
}

function ZoomWatcher({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom ?? 6, { duration: 0.8 });
  }, [target, map]);
  return null;
}

function priceLine(pin) {
  if (pin.price_paid == null) return null;
  return `${pin.currency || '€'}${Number(pin.price_paid).toFixed(2)}`;
}

function PinPopup({ pin }) {
  const author = pin.author;
  return (
    <div className="pin-popup">
      <h4>{pin.name}</h4>
      <p className="pin-popup-meta">
        <span className="stars" aria-label={`${pin.rating} out of 5`}>
          {'★'.repeat(pin.rating)}<span className="dim">{'★'.repeat(5 - pin.rating)}</span>
        </span>
        {priceLine(pin) && <span className="paid">paid {priceLine(pin)}</span>}
      </p>
      {pin.note && <p className="pin-popup-note">“{pin.note}”</p>}
      <p className="pin-popup-by">
        {author ? `${author.avatar_emoji || '🙂'} @${author.username}` : 'A friend'}
        {pin.city ? ` · ${pin.city}` : ''}
      </p>
    </div>
  );
}

function WorldMap({ session }) {
  const [pins, setPins] = useState([]);
  const [state, setState] = useState('loading');
  const [zoom, setZoom] = useState(2);
  const [target, setTarget] = useState(null);
  const [onlyFriends, setOnlyFriends] = useState(false);
  // A real filter on the real price each pin actually logged — pins with no
  // price attached are left out when this is on, rather than guessed at.
  const [maxSpend, setMaxSpend] = useState(null);

  const me = session?.user?.id;

  const refresh = useCallback(async () => {
    setState('loading');
    try {
      setPins(await loadVisiblePins());
      setState('done');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { if (session) refresh(); else setState('signedout'); }, [session, refresh]);

  const shown = useMemo(() => {
    let list = onlyFriends ? pins.filter((p) => p.user_id !== me) : pins;
    if (maxSpend != null) list = list.filter((p) => p.price_paid != null && p.price_paid <= maxSpend);
    return list;
  }, [pins, onlyFriends, me, maxSpend]);

  const countries = useMemo(() => groupByCountry(shown), [shown]);

  if (state === 'signedout') {
    return (
      <section className="map-page empty-state">
        <h2>A map of what your friends actually rate</h2>
        <p>
          Sign in to see where your friends have been, what they paid and whether it was
          worth it.
        </p>
        <Link className="btn-cta" to="/signin">Sign in</Link>
      </section>
    );
  }

  return (
    <section className="map-page">
      <header className="map-head">
        <div>
          <h2>World map</h2>
          <p className="map-sub">
            {shown.length
              ? `${shown.length} ${shown.length === 1 ? 'place' : 'places'} across ${countries.length} ${countries.length === 1 ? 'country' : 'countries'}`
              : 'Nothing pinned yet'}
          </p>
        </div>
        <div className="map-filters">
          <label className="map-toggle">
            <input
              type="checkbox"
              checked={onlyFriends}
              onChange={(e) => setOnlyFriends(e.target.checked)}
            />
            Friends only
          </label>

          <div className="map-spend-filter" role="group" aria-label="Filter by what was paid">
            {[10, 20, 50].map((v) => (
              <button
                key={v}
                type="button"
                className={`map-spend-pill ${maxSpend === v ? 'on' : ''}`}
                onClick={() => setMaxSpend((cur) => (cur === v ? null : v))}
              >
                Spent &lt; €{v}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="map-layout">
        <div className="map-canvas">
          <MapContainer
            center={[20, 10]}
            zoom={2}
            minZoom={2}
            worldCopyJump
            className="leaflet-root"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomWatcher onZoom={setZoom} />
            <FlyTo target={target} />

            {zoom < PLACE_ZOOM
              ? countries.map((c) => (
                  <CircleMarker
                    key={c.code}
                    center={[c.lat, c.lng]}
                    radius={Math.min(10 + c.count * 2.5, 26)}
                    pathOptions={{ color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.75, weight: 2 }}
                    eventHandlers={{ click: () => setTarget({ lat: c.lat, lng: c.lng, zoom: 7 }) }}
                  >
                    <Popup>
                      <div className="pin-popup">
                        <h4>{c.name}</h4>
                        <p className="pin-popup-meta">
                          {c.count} {c.count === 1 ? 'place' : 'places'} · {c.friends}{' '}
                          {c.friends === 1 ? 'person' : 'people'}
                        </p>
                        <p className="pin-popup-note">Average {averageRating(c.pins)} ★</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))
              : shown.map((pin) => (
                  <Marker
                    key={pin.id}
                    position={[pin.lat, pin.lng]}
                    icon={placeIcon(categoryById(pin.category)?.icon || '📍', pin.rating)}
                  >
                    <Popup><PinPopup pin={pin} /></Popup>
                  </Marker>
                ))}
          </MapContainer>
        </div>

        <aside className="map-side">
          {state === 'loading' && <p className="map-note">Loading the map…</p>}
          {state === 'error' && <p className="map-note error">The map could not load.</p>}

          {state === 'done' && !shown.length && (
            <div className="map-note">
              <p><strong>Nothing here yet.</strong></p>
              <p>
                Follow a friend back and their finds appear here. Or rate somewhere
                yourself from <Link to="/discover">Discover</Link>.
              </p>
              <Link className="btn-cta small" to="/friends">Find friends</Link>
            </div>
          )}

          {countries.map((c) => (
            <button
              key={c.code}
              className="country-row"
              onClick={() => setTarget({ lat: c.lat, lng: c.lng, zoom: 7 })}
            >
              <span className="country-name">{c.name}</span>
              <span className="country-count">
                {c.count} · {averageRating(c.pins)}★
              </span>
            </button>
          ))}
        </aside>
      </div>
    </section>
  );
}

export default WorldMap;
