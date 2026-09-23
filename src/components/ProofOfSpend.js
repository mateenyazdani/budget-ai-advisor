import React, { useState } from 'react';
import '../styles/ProofOfSpend.css';

// The "I've been" button on a card already opens PinForm for a place already
// on screen. This is the same flow for a place that never showed up in a
// search — you went somewhere the app never surfaced, and still want to log
// what you paid. It searches for real, using the same /api/places endpoint
// Discover itself uses, rather than inventing a lat/lng-free shortcut.
function ProofOfSpend({ city, coords, onPickPlace }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const close = () => { setOpen(false); setTerm(''); setResults(null); };

  const search = async (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    setSearching(true);
    setResults(null);
    try {
      const params = new URLSearchParams(
        coords ? { lat: String(coords.lat), lng: String(coords.lng) } : { city }
      );
      params.set('query', term.trim());
      const res = await fetch(`/api/places?${params}`);
      const data = await res.json();
      setResults(data.places || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pick = (place) => {
    onPickPlace(place);
    close();
  };

  return (
    <>
      <button type="button" className="pos-trigger" onClick={() => setOpen(true)}>
        + Proof of Spend
      </button>

      {open && (
        <div className="pos-backdrop" role="dialog" aria-modal="true" aria-label="Log what you paid">
          <div className="pos-sheet">
            <button type="button" className="pos-close" onClick={close} aria-label="Close">×</button>
            <h3>Log where you went</h3>
            <p className="pos-sub">Find the place, then rate it — photo, price, a quick note.</p>

            <form className="pos-search" onSubmit={search}>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Place name — e.g. Bar Pepe"
                aria-label="Search for the place"
                autoFocus
              />
              <button type="submit" disabled={searching || !term.trim()}>
                {searching ? '…' : 'Find it'}
              </button>
            </form>

            {results?.length === 0 && (
              <p className="pos-empty">Nothing found for “{term}”. Try just the name, without the city.</p>
            )}

            {results?.length > 0 && (
              <ul className="pos-results">
                {results.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => pick(p)}>
                      <span className="pos-result-name">{p.name}</span>
                      <span className="pos-result-addr">{p.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ProofOfSpend;
