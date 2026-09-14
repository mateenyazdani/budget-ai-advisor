import React, { useState, useEffect } from 'react';
import { getProfile, claimUsername, normaliseUsername } from '../lib/social';
import { loadVisiblePins, deletePin } from '../lib/pins';
import '../styles/Friends.css';

// The signup trigger seeds a username from the email address, which is both
// ugly and possibly someone's real name. This is where a person chooses.
function Profile({ session }) {
  const me = session?.user?.id;
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState('');
  const [avatar, setAvatar] = useState('🙂');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [mine, setMine] = useState([]);

  useEffect(() => {
    if (!me) return;
    getProfile(me).then((p) => {
      setProfile(p);
      setDraft(p?.username || '');
      setAvatar(p?.avatar_emoji || '🙂');
    });
    loadVisiblePins().then((all) => setMine(all.filter((p) => p.user_id === me)));
  }, [me]);

  const save = async (e) => {
    e.preventDefault();
    setError(''); setStatus('');
    const result = await claimUsername(me, draft, { avatar_emoji: avatar });
    if (result.error) { setError(result.error); return; }
    setStatus('Saved.');
    setProfile(await getProfile(me));
  };

  const remove = async (id) => {
    await deletePin(id);
    setMine((list) => list.filter((p) => p.id !== id));
  };

  return (
    <section className="friends-page">
      <h2>Your profile</h2>
      {profile?.username && (
        <p className="friends-sub">
          Friends find you as <strong>@{profile.username}</strong>.
        </p>
      )}

      <form className="profile-form" onSubmit={save}>
        <label className="pin-field">
          <span>Username</span>
          <div className="username-row">
            <input
              className="avatar-input"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value.slice(0, 2))}
              aria-label="Your emoji"
            />
            <span className="at">@</span>
            <input
              value={draft}
              onChange={(e) => setDraft(normaliseUsername(e.target.value))}
              placeholder="yourname"
              aria-label="Username"
            />
          </div>
          <small>Letters, numbers and underscores. This is how friends find you.</small>
        </label>

        {error && <p className="pin-form-error">{error}</p>}
        {status && <p className="friends-note ok">{status}</p>}

        <button className="btn-cta" type="submit">Save</button>
      </form>

      <div className="friend-block">
        <h3>Your pins <span className="count">{mine.length}</span></h3>
        {!mine.length && <p className="friends-note">Nothing pinned yet.</p>}
        <ul className="person-list">
          {mine.map((pin) => (
            <li key={pin.id} className="person-row">
              <span className="person-id">
                <strong>{pin.name}</strong>
                <span className="person-name">
                  {'★'.repeat(pin.rating)}
                  {pin.price_paid != null && ` · ${pin.currency}${Number(pin.price_paid).toFixed(2)}`}
                  {pin.country_name && ` · ${pin.country_name}`}
                </span>
              </span>
              <button className="btn-follow" onClick={() => remove(pin.id)}>Remove</button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default Profile;
