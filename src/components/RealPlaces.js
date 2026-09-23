import React, { useState, useEffect } from 'react';
import { useReveal } from '../lib/useReveal';

// The one thing a marketing page can show that a mockup can't: this app,
// pointed at a real city, finding real places with real photos. Fetched
// once on mount from the same endpoint the app itself uses — nothing here
// is staged, so if the API is ever down this section simply doesn't render
// rather than showing something fake.
const SHOWCASE = [
  { category: 'Dining', label: 'Eat out' },
  { category: 'Padel', label: 'Padel' },
  { category: 'Cinema', label: 'Cinema' },
  { category: 'Hotels', label: 'Hotels' },
];

function RealPlaces() {
  const [places, setPlaces] = useState(null); // null = loading, [] = nothing found
  const [ref, visible] = useReveal();

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      SHOWCASE.map(({ category }) =>
        fetch(`/api/places?city=Madrid&category=${category}&minRating=4`)
          .then((r) => r.json())
          .then((d) => (d.places || []).find((p) => p.photoRef))
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      setPlaces(results.filter(Boolean));
    });
    return () => { cancelled = true; };
  }, []);

  if (places !== null && places.length === 0) return null;

  return (
    <section ref={ref} className={`real-places ${visible ? 'in' : ''}`}>
      <span className="section-eyebrow">Not a mockup</span>
      <h2>Real places, found live in Madrid</h2>
      <p className="section-sub">
        This is what the app actually returned just now — no stock photos, nothing staged.
      </p>

      <div className="real-places-grid">
        {(places || SHOWCASE).map((p, i) =>
          places ? (
            <a
              key={p.id}
              className="real-place-card"
              href={p.mapsUri || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <img
                className="real-place-photo"
                src={`/api/photo?ref=${encodeURIComponent(p.photoRef)}&w=800`}
                alt=""
                loading="lazy"
              />
              <div className="real-place-info">
                <span className="real-place-name">{p.name}</span>
                {p.rating != null && <span className="real-place-rating">★ {p.rating}</span>}
              </div>
            </a>
          ) : (
            <div key={SHOWCASE[i].category} className="real-place-card skeleton" aria-hidden="true" />
          )
        )}
      </div>
    </section>
  );
}

export default RealPlaces;
