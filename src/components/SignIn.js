import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Wordmark } from './Icons';
import '../styles/Auth.css';

const RETURNING_KEY = 'hasAccount';

function SignIn({ onBack }) {
  // Someone who has signed up on this device before is almost certainly here to
  // sign in, and defaulting them to sign-up made them re-register by accident.
  const [mode, setMode] = useState(() =>
    localStorage.getItem(RETURNING_KEY) ? 'signin' : 'signup'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      const { error: authError, data } =
        mode === 'signup'
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });

      if (authError) throw authError;

      localStorage.setItem(RETURNING_KEY, '1');

      // With email confirmation on, sign-up returns a user but no session.
      // Supabase returns the same shape for an address that already exists, so
      // the message has to cover both without confirming the account exists.
      if (mode === 'signup' && !data.session) {
        setNotice(
          'Check your email for a confirmation link. If you already have an account, switch to sign in below.'
        );
        setMode('signin');
      }
      // A successful sign-in is picked up by the auth listener in App.
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1><Wordmark /></h1>
          </div>
          <p className="auth-subtitle">
            Accounts are not configured yet. Set REACT_APP_SUPABASE_URL and
            REACT_APP_SUPABASE_ANON_KEY, then redeploy.
          </p>
          <button className="btn-back" onClick={onBack}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1><Wordmark /></h1>
          <p>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</p>
        </div>

        <div className="mode-switch" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={mode === 'signin' ? 'active' : ''}
            onClick={() => { setMode('signin'); setError(''); setNotice(''); }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => { setMode('signup'); setError(''); setNotice(''); }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <div className="input-group stacked">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="input-group stacked">
            <input
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <div className="error-msg">{error}</div>}
          {notice && <div className="notice-msg">{notice}</div>}

          <button type="submit" className="btn-next" disabled={busy}>
            {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button type="button" className="btn-back" onClick={onBack}>← Back</button>
      </div>

      <div className="auth-footer">
        <p>Your budget is saved to your account, so it is there when you come back.</p>
      </div>
    </div>
  );
}

export default SignIn;
