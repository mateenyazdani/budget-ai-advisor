import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ChartIcon, BasketIcon, TagIcon } from './Icons';
import '../styles/TopBar.css';

// The tab order and labels of the Bargainly Studio design. Each maps onto a
// route that already exists, so nothing here is invented: TODAY is the feed,
// FINANCES is the budget dashboard, DEALS is Discover, and so on.
export const STUDIO_TABS = [
  { to: '/feed', label: 'Today', Icon: TagIcon, keywords: 'feed friends activity home' },
  { to: '/dashboard', label: 'Finances', Icon: ChartIcon, keywords: 'budget money spending income' },
  { to: '/discover', label: 'Deals', Icon: BasketIcon, public: true, keywords: 'discover offers dining padel cinema' },
  { to: '/map', label: 'City map', Icon: PinGlyph, public: true, keywords: 'places pins world' },
  { to: '/friends', label: 'Friends', Icon: PeopleGlyph, keywords: 'social people' },
];

function PinGlyph(p) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 21s-7-6.2-7-11.2A7 7 0 0 1 19 9.8C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.8" r="2.4" />
    </svg>
  );
}

function PeopleGlyph(p) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="9" cy="8" r="3.2" /><path d="M3 20c.4-3.5 3-5.5 6-5.5s5.6 2 6 5.5" /><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.8c1.7.6 2.8 2.2 3 4.2" />
    </svg>
  );
}

// A real, small set of cities. Offers and places are searched by the city
// name, so any of these works with the existing search — "Other…" lets
// someone type a city that is not listed.
const CITIES = [
  { name: 'Madrid', flag: '🇪🇸' },
  { name: 'Barcelona', flag: '🇪🇸' },
  { name: 'London', flag: '🇬🇧' },
  { name: 'Paris', flag: '🇫🇷' },
  { name: 'Lisbon', flag: '🇵🇹' },
  { name: 'Berlin', flag: '🇩🇪' },
  { name: 'Dubai', flag: '🇦🇪' },
  { name: 'New York', flag: '🇺🇸' },
];

export const CITY_EVENT = 'bargainly:city';

export function readCity() {
  try {
    return localStorage.getItem('userCity') || 'Madrid';
  } catch {
    return 'Madrid';
  }
}

function writeCity(name) {
  try {
    localStorage.setItem('userCity', name);
  } catch {
    // Not remembered next visit; the event below still updates this one.
  }
  window.dispatchEvent(new CustomEvent(CITY_EVENT, { detail: name }));
}

function CityPicker() {
  const [city, setCity] = useState(readCity);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const onCity = (e) => setCity(e.detail);
    window.addEventListener(CITY_EVENT, onCity);
    return () => window.removeEventListener(CITY_EVENT, onCity);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (name) => {
    writeCity(name);
    setOpen(false);
    setCustom('');
  };

  const flag = CITIES.find((c) => c.name.toLowerCase() === city.toLowerCase())?.flag || '📍';

  return (
    <div className="tb-city" ref={ref}>
      <button
        type="button"
        className="tb-city-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">{flag}</span>
        <span className="tb-city-name">{city}</span>
        <span className="tb-caret" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="tb-menu" role="listbox" aria-label="Choose a city">
          {CITIES.map((c) => (
            <button
              key={c.name}
              type="button"
              role="option"
              aria-selected={c.name === city}
              className={`tb-menu-item ${c.name === city ? 'on' : ''}`}
              onClick={() => pick(c.name)}
            >
              <span aria-hidden="true">{c.flag}</span> {c.name}
            </button>
          ))}
          <form
            className="tb-menu-custom"
            onSubmit={(e) => {
              e.preventDefault();
              const next = custom.trim();
              if (next) pick(next);
            }}
          >
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Another city…"
              aria-label="Another city"
            />
          </form>
        </div>
      )}
    </div>
  );
}

// ⌘K / Ctrl+K opens a command palette. It jumps between tabs, or hands a
// plain-English query to the deals search, which already understands
// free-text such as "padel" or "dinner".
function Spotlight({ open, onClose, tabs }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const term = q.trim().toLowerCase();
  const matches = useMemo(
    () => tabs.filter((t) => !term || `${t.label} ${t.keywords}`.toLowerCase().includes(term)),
    [tabs, term]
  );

  if (!open) return null;

  const go = (to) => {
    navigate(to);
    onClose();
  };

  const submit = (e) => {
    e.preventDefault();
    if (term && matches.length === 1 && matches[0].label.toLowerCase() === term) {
      go(matches[0].to);
    } else if (term) {
      go(`/discover?q=${encodeURIComponent(q.trim())}`);
    } else if (matches[0]) {
      go(matches[0].to);
    }
  };

  return (
    <div className="tb-overlay" role="dialog" aria-modal="true" aria-label="Spotlight search" onMouseDown={onClose}>
      <div className="tb-spot" onMouseDown={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <input
            ref={inputRef}
            className="tb-spot-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search “padel”, “dinner under €25”, or jump to a tab…"
            aria-label="Spotlight search"
          />
        </form>
        <ul className="tb-spot-list">
          {term && (
            <li>
              <button type="button" className="tb-spot-row primary" onClick={() => go(`/discover?q=${encodeURIComponent(q.trim())}`)}>
                <span className="tb-spot-label">Search deals for “{q.trim()}”</span>
                <kbd>↵</kbd>
              </button>
            </li>
          )}
          {matches.map((t) => (
            <li key={t.to}>
              <button type="button" className="tb-spot-row" onClick={() => go(t.to)}>
                <span className="tb-spot-ico"><t.Icon /></span>
                <span className="tb-spot-label">Go to {t.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function TopBar({ session, budget, insight, theme, onToggleTheme, onSignOut, showTabs = true }) {
  const { pathname } = useLocation();
  const [spotOpen, setSpotOpen] = useState(false);
  const tabs = session ? STUDIO_TABS : STUDIO_TABS.filter((t) => t.public);
  const username = session?.user?.email?.split('@')[0];

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpotOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setSpotOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

  return (
    <>
      <header className="tb">
        <div className="tb-row">
          <NavLink to={session ? '/feed' : '/'} className="tb-brand" aria-label="Bargainly home">
            <span className="tb-wordmark">Bargainly</span>
            <span className="tb-studio">Studio</span>
          </NavLink>

          <CityPicker />

          {showTabs && (
          <nav className="tb-tabs" aria-label="Main">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `tb-tab ${isActive || (t.to === '/dashboard' && /^\/(bank|advisor)/.test(pathname)) ? 'active' : ''}`
                }
              >
                <span className="tb-tab-ico"><t.Icon /></span>
                <span className="tb-tab-label">{t.label}</span>
              </NavLink>
            ))}
          </nav>
          )}

          <div className="tb-right">
            <button type="button" className="tb-spot-btn" onClick={() => setSpotOpen(true)} aria-label="Open Spotlight search">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
              <span className="tb-spot-hint">Search ‘padel’, ‘dinner’…</span>
              <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>

            {insight && (
              <div className="tb-allow" title="What you can spend today without going over this month's budget">
                <span className="tb-allow-label">Daily allowance</span>
                <span className="tb-allow-value">{budget.currency}{Number(insight.safeToday).toLocaleString()}</span>
              </div>
            )}

            <button
              type="button"
              className="tb-icon-btn"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {session ? (
              <>
                <NavLink className="tb-user" to="/profile">@{username}</NavLink>
                <button type="button" className="tb-signout" onClick={onSignOut}>Sign out</button>
              </>
            ) : (
              <NavLink className="tb-signout" to="/signin">Sign in</NavLink>
            )}
          </div>
        </div>
      </header>
      <Spotlight open={spotOpen} onClose={() => setSpotOpen(false)} tabs={tabs} />
    </>
  );
}
