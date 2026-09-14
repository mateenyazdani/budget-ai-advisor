import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadVisiblePins, pinPhotoUrl } from '../lib/pins';
import { categoryById } from '../lib/categories';
import { SENTIMENTS } from '../lib/ranking';
import '../styles/Feed.css';

// One friend's verdict on one place, photo-first. The map answers "where has
// everyone been"; this answers "what did someone just do" — the reason to
// open the app again is a new card at the top, not a bubble that moved.
function FeedCard({ pin, photoUrl }) {
  const sentiment = SENTIMENTS.find((s) => s.id === pin.sentiment);
  const cat = categoryById(pin.category);
  const when = timeAgo(pin.created_at);

  return (
    <article className="feed-card">
      <div className="feed-photo-wrap">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="feed-photo" loading="lazy" />
        ) : (
          <div className="feed-photo-empty" aria-hidden="true">
            <span className="feed-photo-emoji">{cat?.icon || '📍'}</span>
          </div>
        )}
        {pin.score != null && (
          <span className="feed-score-badge">
            {sentiment?.emoji} {Number(pin.score).toFixed(1)}
          </span>
        )}
      </div>

      <div className="feed-card-body">
        <p className="feed-who">
          <span className="feed-avatar" aria-hidden="true">{pin.author?.avatar_emoji || '🙂'}</span>
          <Link to="/friends" className="feed-username">@{pin.author?.username || 'someone'}</Link>
          <span className="feed-when">{when}</span>
        </p>
        <h3 className="feed-place">
          {cat && <span aria-hidden="true">{cat.icon}</span>} {pin.name}
        </h3>
        {pin.note && <p className="feed-note">“{pin.note}”</p>}
        <div className="feed-meta">
          {pin.price_paid != null && (
            <span>{pin.currency}{Number(pin.price_paid).toFixed(2)}</span>
          )}
          {pin.city && <span>{pin.city}</span>}
        </div>
      </div>
    </article>
  );
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Feed({ session }) {
  const [pins, setPins] = useState(null); // null = loading
  const [photos, setPhotos] = useState({});

  useEffect(() => {
    let cancelled = false;
    loadVisiblePins().then(async (all) => {
      if (cancelled) return;
      setPins(all);
      // Signed URLs expire, so they are fetched fresh on every load rather
      // than stored — this trades a burst of requests for never showing a
      // broken image from a link that quietly went stale.
      const withPhotos = all.filter((p) => p.photo_path);
      const urls = await Promise.all(withPhotos.map((p) => pinPhotoUrl(p.photo_path)));
      if (cancelled) return;
      const map = {};
      withPhotos.forEach((p, i) => { map[p.id] = urls[i]; });
      setPhotos(map);
    });
    return () => { cancelled = true; };
  }, [session]);

  return (
    <section className="feed-page">
      <header className="feed-head">
        <h2>Feed</h2>
        <Link to="/map" className="feed-map-link">View on map →</Link>
      </header>

      {pins === null && <p className="friends-note">Loading…</p>}

      {pins?.length === 0 && (
        <div className="feed-empty">
          <p className="friends-note">
            Nothing yet. Once you and a friend follow each other, what either of you pins shows up
            here.
          </p>
          <Link to="/friends" className="btn-cta feed-empty-cta">Find friends</Link>
        </div>
      )}

      {pins?.length > 0 && (
        <div className="feed-list">
          {pins.map((pin) => (
            <FeedCard key={pin.id} pin={pin} photoUrl={photos[pin.id]} />
          ))}
        </div>
      )}
    </section>
  );
}

export default Feed;
