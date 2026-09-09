import React, { useState } from 'react';
import '../styles/Auth.css';

function Auth({ onLogin }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      setError('Please enter a valid phone number');
      return;
    }
    setStep('username');
    setError('');
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    setStep('confirm');
    setError('');
  };

  const handleConfirm = () => {
    const user = { phone, username };
    localStorage.setItem('budgetUser', JSON.stringify(user));
    onLogin(user);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>💰 Budget AI</h1>
          <p>Smart spending starts here</p>
        </div>

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="auth-form">
            <h2>Enter your phone number</h2>
            <p className="auth-subtitle">We'll use this to secure your account</p>
            <div className="input-group">
              <span className="country-code">+34</span>
              <input type="tel" placeholder="612 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength="12" />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-next">Next →</button>
          </form>
        )}

        {step === 'username' && (
          <form onSubmit={handleUsernameSubmit} className="auth-form">
            <h2>Create your username</h2>
            <p className="auth-subtitle">This is how friends will find you</p>
            <div className="input-group">
              <span className="username-icon">@</span>
              <input type="text" placeholder="yourname" value={username} onChange={(e) => setUsername(e.target.value)} maxLength="20" />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-next">Next →</button>
            <button type="button" className="btn-back" onClick={() => setStep('phone')}>← Back</button>
          </form>
        )}

        {step === 'confirm' && (
          <div className="auth-confirm">
            <h2>Confirm your details</h2>
            <div className="confirm-card">
              <div className="confirm-row">
                <span className="label">Phone</span>
                <span className="value">+34 {phone}</span>
              </div>
              <div className="confirm-row">
                <span className="label">Username</span>
                <span className="value">@{username}</span>
              </div>
            </div>
            <button className="btn-confirm" onClick={handleConfirm}>✓ Confirm & Enter</button>
            <button className="btn-back" onClick={() => setStep('username')}>← Change</button>
          </div>
        )}
      </div>

      <div className="auth-footer">
        <p>Your data is encrypted and secure</p>
      </div>
    </div>
  );
}

export default Auth;
