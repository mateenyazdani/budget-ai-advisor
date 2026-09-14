import React, { useState, useEffect, useCallback } from 'react';
import { loadGraph, searchUsers, follow, unfollow } from '../lib/social';
import { loadVisiblePins } from '../lib/pins';
import { categoryById } from '../lib/categories';
import { SENTIMENTS } from '../lib/ranking';
import '../styles/Friends.css';

function PersonRow({ person, action, onAction, busy, hint }) {
  return (
    <li className="person-row">
      <span className="person-avatar" aria-hidden="true">{person.avatar_emoji || '🙂'}</span>
      <span className="person-id">
        <strong>@{person.username}</strong>
        {person.display_name && <span className="person-name">{person.display_name}</span>}
        {hint && <span className="person-hint">{hint}</span>}
      </span>
      {action && (
        <button className="btn-follow" onClick={() => onAction(person)} disabled={busy}>
          {action}
        </button>
      )}
    </li>
  );
}

// One recent verdict from someone the viewer follows both ways — what they
// rated, out of ten, and what they said about it.
function FeedRow({ pin }) {
  const sentiment = SENTIMENTS.find((s) => s.id === pin.sentiment);
  const cat = categoryById(pin.category);
  return (
    <li className="feed-row">
      <span className="person-avatar" aria-hidden="true">{pin.author?.avatar_emoji || '🙂'}</span>
      <div className="feed-body">
        <p className="feed-line">
          <strong>@{pin.author?.username || 'someone'}</strong>
          {' '}{sentiment?.emoji || '📍'} rated{' '}
          <strong>{pin.name}</strong>
          {cat && <span className="feed-cat"> {cat.icon}</span>}
        </p>
        {pin.score != null && (
          <span className="feed-score">{Number(pin.score).toFixed(1)}/10</span>
        )}
        {pin.note && <p className="feed-note">“{pin.note}”</p>}
      </div>
    </li>
  );
}

function Friends({ session }) {
  const me = session?.user?.id;
  const [graph, setGraph] = useState({ friends: [], following: [], followers: [] });
  const [feed, setFeed] = useState([]);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(async () => {
    if (me) setGraph(await loadGraph(me));
  }, [me]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!me) return;
    // Every pin the viewer is allowed to see, already row-level-security
    // filtered to their own and their mutual friends' — the feed is just that
    // list read chronologically instead of grouped by place.
    loadVisiblePins().then((all) => setFeed(all.filter((p) => p.user_id !== me).slice(0, 20)));
  }, [me]);

  // A search on every keystroke would be a request per letter. Waiting a beat
  // after typing stops turns one search per word.
  useEffect(() => {
    if (term.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const id = setTimeout(async () => {
      setResults(await searchUsers(term, me));
      setSearching(false);
    }, 300);
    return () => clearTimeout(id);
  }, [term, me]);

  const act = async (person, fn) => {
    setBusyId(person.id);
    await fn(person.id);
    await refresh();
    if (term.trim().length >= 2) setResults(await searchUsers(term, me));
    setBusyId(null);
  };

  const known = new Set([
    ...graph.friends.map((p) => p.id),
    ...graph.following.map((p) => p.id),
  ]);

  return (
    <section className="friends-page">
      <h2>Friends</h2>
      <p className="friends-sub">
        Maps are mutual. You see someone's pins once you both follow each other —
        a one-way follow shows nothing.
      </p>

      {feed.length > 0 && (
        <div className="friend-block">
          <h3>Recent</h3>
          <ul className="person-list feed-list">
            {feed.map((pin) => <FeedRow key={pin.id} pin={pin} />)}
          </ul>
        </div>
      )}

      <div className="friend-search">
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search a username"
          aria-label="Search for a username"
        />
      </div>

      {term.trim().length >= 2 && (
        <div className="friend-block">
          <h3>Results</h3>
          {searching && <p className="friends-note">Searching…</p>}
          {!searching && !results.length && <p className="friends-note">No one by that name.</p>}
          <ul className="person-list">
            {results.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                busy={busyId === p.id}
                action={known.has(p.id) ? 'Unfollow' : 'Follow'}
                onAction={(person) => act(person, known.has(p.id) ? unfollow : follow)}
              />
            ))}
          </ul>
        </div>
      )}

      {graph.followers.length > 0 && (
        <div className="friend-block highlight">
          <h3>Follows you</h3>
          <p className="friends-note">Follow back and you will see each other's maps.</p>
          <ul className="person-list">
            {graph.followers.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                busy={busyId === p.id}
                action="Follow back"
                onAction={(person) => act(person, follow)}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="friend-block">
        <h3>Friends <span className="count">{graph.friends.length}</span></h3>
        {!graph.friends.length && (
          <p className="friends-note">No mutual follows yet, so your map is only your own.</p>
        )}
        <ul className="person-list">
          {graph.friends.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              busy={busyId === p.id}
              action="Unfollow"
              onAction={(person) => act(person, unfollow)}
            />
          ))}
        </ul>
      </div>

      {graph.following.length > 0 && (
        <div className="friend-block">
          <h3>Waiting on them</h3>
          <ul className="person-list">
            {graph.following.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                busy={busyId === p.id}
                hint="has not followed back"
                action="Unfollow"
                onAction={(person) => act(person, unfollow)}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default Friends;
