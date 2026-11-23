import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadVisiblePins, pinPhotoUrl } from '../lib/pins';
import { categoryById } from '../lib/categories';
import { SENTIMENTS } from '../lib/ranking';
import { timeAgo } from '../lib/timeAgo';
import { getInsights } from '../utils/insights';
import { logExpenseLocally } from '../lib/localExpenses';
import { HeartIcon, CommentIcon, BookmarkIcon } from './Icons';
import BudgetHUD from './BudgetHUD';
import SpendTrend from './SpendTrend';
import '../styles/Feed.css';

// Fictional, clearly-not-you example activity — shown only while your real
// feed is empty, so a new account isn't just a blank page. Real categories
// (so the icons match the rest of the app), invented people, never your own
// name or photo standing in for someone else's post. Real stock photos
// (Unsplash, freely licensed) for the visual — the honesty line was never
// about decorative imagery, only about numbers/people presented as real.
// The like/comment counts here are illustrative for the same reason: this
// whole block is already labeled "what it looks like," not a live claim.
const EXAMPLE_POSTS = [
  {
    id: 'example-1',
    author: 'Carlos', avatarEmoji: '🧑‍🍳',
    photo: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
    place: 'Mercado San Miguel', city: 'Madrid', categoryId: 'Dining',
    note: 'Stone-ground corn tacos, way better than the sit-down place next door. #MadridEats',
    price: 12.5, currency: '€', timeLabel: '2d ago', likes: 128, comments: 14,
  },
  {
    id: 'example-2',
    author: 'Sofia', avatarEmoji: '🎾',
    photo: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=800&auto=format&fit=crop&q=80',
    place: 'Club Padel Chamartín', city: 'Madrid', categoryId: 'Padel',
    note: 'Split a court 4 ways instead of booking solo — a third of the price. #FriendSplit',
    price: 5, currency: '€', timeLabel: '4d ago', likes: 76, comments: 9,
  },
  {
    id: 'example-3',
    author: 'Lucas', avatarEmoji: '🧘',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80',
    place: 'Parque del Retiro', city: 'Madrid', categoryId: 'Yoga',
    note: 'Free outdoor class by the lake most Sunday mornings. #FreeActivity',
    price: 0, currency: '€', timeLabel: '6d ago', likes: 203, comments: 22,
  },
];

function ExampleCard({ post }) {
  const cat = categoryById(post.categoryId);
  const [logged, setLogged] = useState(false);

  const logThisToo = () => {
    logExpenseLocally({
      amount: post.price,
      category: cat?.label || 'Other',
      note: `${post.place} — from an example card`,
    });
    setLogged(true);
  };

  return (
    <article className="feed-card feed-card-example">
      <div className="feed-photo-wrap">
        <img className="feed-photo" src={post.photo} alt="" loading="lazy" />
        <span className="feed-example-badge">Example</span>
      </div>
      <div className="feed-card-body">
        <p className="feed-who">
          <span className="feed-avatar" aria-hidden="true">{post.avatarEmoji}</span>
          <span className="feed-username">{post.author}</span>
          <span className="feed-when">{post.timeLabel}</span>
        </p>
        <h3 className="feed-place">
          {cat && <span aria-hidden="true">{cat.icon}</span>} {post.place}
        </h3>
        <p className="feed-note">{post.note}</p>
        <div className="feed-price-row">
          <span className="feed-price amount chip">{post.currency}{post.price.toFixed(2)}</span>
          <span className="feed-city">{post.city}</span>
        </div>
        <div className="feed-engagement">
          <span className="feed-eng-item"><HeartIcon filled className="feed-eng-icon liked" />{post.likes}</span>
          <span className="feed-eng-item"><CommentIcon className="feed-eng-icon" />{post.comments}</span>
          <BookmarkIcon className="feed-eng-icon feed-eng-bookmark" />
        </div>
        {post.price > 0 && (
          <button
            type="button"
            className={`feed-add-budget-btn ${logged ? 'done' : ''}`}
            onClick={logThisToo}
            disabled={logged}
          >
            {logged ? '✓ Added to My Budget' : 'Add to My Budget'}
          </button>
        )}
      </div>
    </article>
  );
}


// One friend's verdict on one place, photo-first. The map answers "where has
// everyone been"; this answers "what did someone just do" — the reason to
// open the app again is a new card at the top, not a bubble that moved.
function FeedCard({ pin, photoUrl }) {
  const sentiment = SENTIMENTS.find((s) => s.id === pin.sentiment);
  const cat = categoryById(pin.category);
  const when = timeAgo(pin.created_at);
  const [logged, setLogged] = useState(false);
  const [liked, setLiked] = useState(false);

  const logThisToo = () => {
    logExpenseLocally({
      amount: Number(pin.price_paid),
      category: cat?.label || 'Other',
      note: `${pin.name} — spotted in the feed`,
    });
    setLogged(true);
  };

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

        <div className="feed-price-row">
          {pin.price_paid != null ? (
            <span className="feed-price amount chip">{pin.currency}{Number(pin.price_paid).toFixed(2)}</span>
          ) : (
            <span className="feed-price-unknown">No price logged</span>
          )}
          {pin.city && <span className="feed-city">{pin.city}</span>}
        </div>

        <div className="feed-engagement">
          <button
            type="button"
            className="feed-eng-item feed-eng-btn"
            onClick={() => setLiked((v) => !v)}
            aria-pressed={liked}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <HeartIcon filled={liked} className={`feed-eng-icon ${liked ? 'liked' : ''}`} />
          </button>
          <span className="feed-eng-item"><CommentIcon className="feed-eng-icon" /></span>
          <span className="feed-eng-spacer" />
          <BookmarkIcon className="feed-eng-icon feed-eng-bookmark" />
        </div>

        <div className="feed-actions">
          {/* A review with nowhere to go from it is just a scroll-past. Built
              from the pin's own coordinates — the one thing every pin has,
              unlike phone or website, which are only known at search time. */}
          {Number.isFinite(pin.lat) && Number.isFinite(pin.lng) && (
            <a
              className="feed-map-cta"
              href={`https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Maps →
            </a>
          )}
          {/* Did the same thing your friend did? One tap adds the same real
              price to your own expenses — nothing here is guessed. */}
          {pin.price_paid != null && (
            <button
              type="button"
              className={`feed-log-btn ${logged ? 'done' : ''}`}
              onClick={logThisToo}
              disabled={logged}
            >
              {logged ? '✓ Logged' : `+ Log ${pin.currency}${Number(pin.price_paid).toFixed(2)} too`}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// Real numbers only — the same fields getInsights() already computes for
// BudgetHUD, shown here as a standing sidebar so the feed doesn't need a
// trip to /dashboard just to see what's left to spend.
function BudgetSidebar({ budget, insight }) {
  if (!budget || !insight) return null;
  const money = (n) => `${budget.currency || '€'}${Math.round(n).toLocaleString()}`;

  return (
    <div className={`feed-budget-card status-${insight.status}`}>
      <div className="feed-budget-head">
        <span className="feed-budget-title">Today's budget</span>
        <span className={`feed-budget-pill status-${insight.status}`}>
          {insight.status === 'risk' ? 'Over plan' : insight.status === 'attention' ? 'Tight' : 'On track'}
        </span>
      </div>
      <span className="feed-budget-amount">{money(insight.safeToday)}</span>
      <span className="feed-budget-sub">safe to spend today · {insight.daysLeft}d left this month</span>

      <div className="feed-budget-rows">
        <div className="feed-budget-row">
          <span>Monthly income</span>
          <span>{money(budget.monthlyIncome)}</span>
        </div>
        <div className="feed-budget-row">
          <span>Total expenses</span>
          <span>{money(budget.totalExpenses || 0)}</span>
        </div>
        <div className="feed-budget-row total">
          <span>Surplus</span>
          <span>{money(budget.surplus || 0)}</span>
        </div>
      </div>

      <Link to="/dashboard" className="feed-budget-cta">+ Add expense manually</Link>
    </div>
  );
}

function Feed({ session, budget }) {
  const navigate = useNavigate();
  const [pins, setPins] = useState(null); // null = loading
  const [photos, setPhotos] = useState({});
  const [term, setTerm] = useState('');
  const insight = budget ? getInsights(budget) : null;

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
    <div className="feed-layout">
      <section className="feed-page">
        <header className="feed-head">
          <h2>Feed</h2>
          <Link to="/map" className="feed-map-link">View on map →</Link>
        </header>

        {/* The big gauge from the home screen leads here too — the reason to
            open the app is either "what happened" (the feed below) or "what
            can I spend" (this), so both live on the same first screen. */}
        {insight && (
          <div className="feed-hero">
            <BudgetHUD
              insight={insight}
              currency={budget.currency}
              fitActive={false}
              onFitBudget={(amount) => navigate(`/discover?budget=${amount}`)}
            />
            <SpendTrend currency={budget.currency} />
          </div>
        )}

        {/* A friend visiting from out of town does not want the whole feed —
            they want "what did anyone say about padel". Filters what has
            already loaded rather than a second query. */}
        {pins?.length > 0 && (
          <input
            className="feed-search"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search what friends have rated — padel, tacos, a name…"
            aria-label="Search the feed"
          />
        )}

        {pins === null && <p className="friends-note">Loading…</p>}

        {pins?.length === 0 && (
          <div className="feed-empty">
            <p className="friends-note">
              Nothing yet. Once you and a friend follow each other, what either of you pins shows up
              here.
            </p>
            <Link to="/friends" className="btn-cta feed-empty-cta">Find friends</Link>

            <div className="feed-example-block">
              <p className="feed-example-label">What it looks like once that happens:</p>
              <div className="feed-list">
                {EXAMPLE_POSTS.map((post) => <ExampleCard key={post.id} post={post} />)}
              </div>
            </div>
          </div>
        )}

        {pins?.length > 0 && (() => {
          const q = term.trim().toLowerCase();
          const filtered = q
            ? pins.filter((p) => {
                const cat = categoryById(p.category);
                return p.name.toLowerCase().includes(q)
                  || cat?.label.toLowerCase().includes(q)
                  || p.note?.toLowerCase().includes(q)
                  || p.city?.toLowerCase().includes(q);
              })
            : pins;
          return filtered.length > 0 ? (
            <div className="feed-list">
              {filtered.map((pin) => (
                <FeedCard key={pin.id} pin={pin} photoUrl={photos[pin.id]} />
              ))}
            </div>
          ) : (
            <p className="friends-note">Nothing matches “{term}”.</p>
          );
        })()}
      </section>

      {insight && (
        <aside className="feed-sidebar">
          <BudgetSidebar budget={budget} insight={insight} />
        </aside>
      )}
    </div>
  );
}

export default Feed;
