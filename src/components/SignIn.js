import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import '../styles/Auth.css';

function SignIn({ onBack }) {
  const [mode, setMode] = useState('signup');
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

      // With email confirmation on, sign-up returns a user but no session.
      if (mode === 'signup' && !data.session) {
        setNotice('Check your email to confirm your address, then sign in.');
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
            <h1>💰 Budget AI</h1>
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
          <h1>💰 Budget AI</h1>
          <p>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</p>
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

        <button
          type="button"
          className="btn-link"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice(''); }}
        >
          {mode === 'signup' ? 'I already have an account' : 'Create an account instead'}
        </button>

        <button type="button" className="btn-back" onClick={onBack}>← Back</button>
      </div>

      <div className="auth-footer">
        <p>Your budget is saved to your account, so it is there when you come back.</p>
      </div>
    </div>
  );
}

export default SignIn;
