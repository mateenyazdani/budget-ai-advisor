import React, { useState } from 'react';
import { savePin } from '../lib/pins';
import '../styles/PinForm.css';

// Opened from a venue card, so the place, its coordinates and its country are
// already known. All that is left is the part only a person can supply: what it
// cost them, out of five, and why.
function PinForm({ place, category, onClose, onSaved }) {
  const [rating, setRating] = useState(0);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const missingLocation = !Number.isFinite(place?.lat) || !place?.countryCode;

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Give it a rating first.'); return; }
    setSaving(true);
    setError('');

    const result = await savePin({
      placeId: place.id,
      name: place.name,
      category,
      countryCode: place.countryCode,
      countryName: place.countryName,
      city: place.city || null,
      lat: place.lat,
      lng: place.lng,
      rating,
      pricePaid: price === '' ? null : Number(price),
      note: note.trim() || null,
    });

    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onSaved?.(result.pin);
    onClose();
  };

  return (
    <div className="pin-form-backdrop" role="dialog" aria-modal="true" aria-label={`Rate ${place?.name}`}>
      <form className="pin-form" onSubmit={submit}>
        <button type="button" className="pin-form-close" onClick={onClose} aria-label="Close">×</button>

        <h3>{place?.name}</h3>
        <p className="pin-form-where">{place?.address || place?.countryName}</p>

        {missingLocation ? (
          <p className="pin-form-error">
            Google gave no location for this place, so it cannot go on the map.
          </p>
        ) : (
          <>
            <fieldset className="pin-stars">
              <legend>Worth it?</legend>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`star ${n <= rating ? 'on' : ''}`}
                  onClick={() => setRating(n)}
                  aria-label={`${n} out of 5`}
                  aria-pressed={n === rating}
                >
                  ★
                </button>
              ))}
            </fieldset>

            <label className="pin-field">
              <span>What did you pay?</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 12.50"
              />
              <small>Optional — but a real price is the most useful thing here.</small>
            </label>

            <label className="pin-field">
              <span>Say something</span>
              <textarea
                value={note}
                maxLength={500}
                rows={3}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Menu del día, three courses, no tourists."
              />
            </label>

            {error && <p className="pin-form-error">{error}</p>}

            <div className="pin-form-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-cta" disabled={saving}>
                {saving ? 'Pinning…' : 'Pin it'}
              </button>
            </div>
            <p className="pin-form-privacy">Only people you both follow can see this.</p>
          </>
        )}
      </form>
    </div>
  );
}

export default PinForm;
