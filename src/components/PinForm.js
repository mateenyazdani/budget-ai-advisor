import React, { useState, useEffect, useCallback } from 'react';
import { savePin, uploadPinPhoto, pinPhotoUrl } from '../lib/pins';
import { loadMyPinsBySentiment } from '../lib/pins';
import { SENTIMENTS, nextComparison, afterComparison, scoreFromInsertion } from '../lib/ranking';
import '../styles/PinForm.css';

// Opened from a venue card, so the place, its coordinates and its country are
// already known. What is left is the part only a person can supply: how it
// felt, how it stacks up against places they already rated, what it cost, and
// why — in that order, because "4 stars" means nothing next to another 4-star
// place until you've said which one was actually better.
//
// `initial` is the pin being edited, if any. Editing skips straight past the
// sentiment and comparison steps — fixing a typo in a note should not force
// a fresh round of "which was better" — but a link back into that flow is
// still there for anyone who genuinely wants to re-rank it.
function PinForm({ place, category, session, initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  // sentiment -> comparing -> details -> saving
  const [step, setStep] = useState(isEdit ? 'details' : 'sentiment');
  const [sentiment, setSentiment] = useState(initial?.sentiment || null);

  // The binary search's own state: the sorted bucket, and the [lo, hi) window
  // still to narrow. Once lo === hi, that index is where this place belongs.
  const [bucket, setBucket] = useState([]);
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(0);
  const [round, setRound] = useState(0);

  const [score, setScore] = useState(initial?.score ?? null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [existingPhotoPath, setExistingPhotoPath] = useState(initial?.photo_path || null);
  const [price, setPrice] = useState(initial?.price_paid != null ? String(initial.price_paid) : '');
  const [note, setNote] = useState(initial?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // The existing photo lives behind a signed URL, not a plain src — it has to
  // be fetched before there is anything to show as the starting preview.
  useEffect(() => {
    if (!initial?.photo_path) return;
    let cancelled = false;
    pinPhotoUrl(initial.photo_path).then((url) => { if (!cancelled) setPhotoPreview(url); });
    return () => { cancelled = true; };
  }, [initial?.photo_path]);

  // The preview is a blob URL when it came from a freshly picked file, which
  // leaks memory if never revoked. A signed URL (the existing-photo case) is
  // not a blob and revoking it is a harmless no-op.
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const pickPhoto = (file) => {
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setExistingPhotoPath(null);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setExistingPhotoPath(null);
    setPhotoPreview(null);
  };

  // The escape hatch out of a quick edit, into a full re-rank against
  // everything else already rated in whichever bucket it ends up in.
  const rerank = () => {
    setSentiment(null);
    setScore(null);
    setStep('sentiment');
  };

  const missingLocation = !Number.isFinite(place?.lat) || !place?.countryCode;

  const pickSentiment = useCallback(async (s) => {
    setSentiment(s);
    setError('');
    const existing = await loadMyPinsBySentiment(s);
    // Rating the same place twice replaces the old pin rather than adding a
    // second one, so it cannot be compared against itself.
    const others = existing.filter((p) => p.place_id !== place?.id);
    setBucket(others);
    setLo(0);
    setHi(others.length);
    setRound(0);
    if (others.length === 0) {
      // Nothing to compare against yet — this becomes the bucket's first
      // reference point, sitting in the middle of its range.
      setScore(scoreFromInsertion(s, [], 0));
      setStep('details');
    } else {
      setStep('comparing');
    }
  }, [place?.id]);

  const current = nextComparison(bucket, lo, hi);

  const answer = (won) => {
    const mid = Math.floor((lo + hi) / 2);
    const next = afterComparison(lo, hi, mid, won);
    setRound((r) => r + 1);
    if (next.lo >= next.hi) {
      setScore(scoreFromInsertion(sentiment, bucket, next.lo));
      setStep('details');
    } else {
      setLo(next.lo);
      setHi(next.hi);
    }
  };

  useEffect(() => {
    // A comparison round with nothing left to show (should not happen, but a
    // stale index here would freeze the wizard rather than fail loudly).
    if (step === 'comparing' && !current) {
      setScore(scoreFromInsertion(sentiment, bucket, lo));
      setStep('details');
    }
  }, [step, current, sentiment, bucket, lo]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // An edit keeps the pin's existing id, so a new photo overwrites the same
    // storage path instead of orphaning the old file. A fresh pin generates
    // one here rather than letting Postgres do it, so the photo can be
    // uploaded to its final path before the row that points at it exists —
    // if the upload fails, nothing gets saved half-finished.
    const pinId = initial?.id || crypto.randomUUID();
    let photoPath = existingPhotoPath;
    if (photo && session?.user?.id) {
      const uploaded = await uploadPinPhoto(session.user.id, pinId, photo);
      if (uploaded.error) { setSaving(false); setError(`Photo failed to upload: ${uploaded.error}`); return; }
      photoPath = uploaded.path;
    }

    const result = await savePin({
      id: pinId,
      placeId: place.id,
      name: place.name,
      category,
      countryCode: place.countryCode,
      countryName: place.countryName,
      city: place.city || null,
      lat: place.lat,
      lng: place.lng,
      sentiment,
      score,
      photoPath,
      pricePaid: price === '' ? null : Number(price),
      note: note.trim() || null,
    });

    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onSaved?.(result.pin);
    onClose();
  };

  const sentimentMeta = SENTIMENTS.find((s) => s.id === sentiment);

  return (
    <div
      className="pin-form-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${isEdit ? 'Edit' : 'Rate'} ${place?.name}`}
    >
      <div className="pin-form">
        <button type="button" className="pin-form-close" onClick={onClose} aria-label="Close">×</button>

        <h3>{place?.name}</h3>
        <p className="pin-form-where">{place?.address || place?.countryName}</p>

        {missingLocation ? (
          <p className="pin-form-error">
            Google gave no location for this place, so it cannot go on the map.
          </p>
        ) : step === 'sentiment' ? (
          <div className="pin-sentiment">
            <p className="pin-step-label">How was it?</p>
            {SENTIMENTS.map((s) => (
              <button key={s.id} type="button" className="sentiment-btn" onClick={() => pickSentiment(s.id)}>
                <span aria-hidden="true">{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>
        ) : step === 'comparing' && current ? (
          <div className="pin-compare">
            <p className="pin-step-label">
              Which was better? <span className="pin-step-hint">round {round + 1}</span>
            </p>
            <div className="compare-pair">
              <button type="button" className="compare-card" onClick={() => answer(true)}>
                <span className="compare-name">{place?.name}</span>
                <span className="compare-tag">this one</span>
              </button>
              <span className="compare-vs">vs</span>
              <button type="button" className="compare-card" onClick={() => answer(false)}>
                <span className="compare-name">{current.name}</span>
                <span className="compare-tag">already rated</span>
              </button>
            </div>
            <p className="pin-step-note">
              A couple of these narrows it down to a real score — no guessing a number out of ten.
            </p>
          </div>
        ) : step === 'details' ? (
          <form onSubmit={submit}>
            <div className="pin-score-preview">
              <span aria-hidden="true">{sentimentMeta?.emoji}</span>
              <strong>{score?.toFixed(1)}</strong>
              <span className="pin-score-of10">/10</span>
              {isEdit && (
                <button type="button" className="pin-rerank-link" onClick={rerank}>
                  Change how it compares
                </button>
              )}
            </div>

            <label className="pin-photo-picker">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="pin-photo-preview" />
              ) : (
                <span className="pin-photo-empty">
                  <span className="pin-photo-icon" aria-hidden="true">📷</span>
                  Take a photo
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
            </label>
            {photoPreview && (
              <button type="button" className="pin-photo-remove" onClick={removePhoto}>
                Remove photo
              </button>
            )}

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
                {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Pin it'}
              </button>
            </div>
            <p className="pin-form-privacy">Only people you both follow can see this.</p>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export default PinForm;
