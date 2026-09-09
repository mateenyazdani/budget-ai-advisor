import React, { useState } from 'react';
import '../styles/PriceCheck.css';

function PriceCheck({ age }) {
  const [city, setCity] = useState(() => localStorage.getItem('userCity') || 'Madrid');
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  const lookup = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    localStorage.setItem('userCity', city.trim());
    setState('loading');
    setMessage('');

    // Transport and subscriptions are separate requests so neither hits the
    // serverless time limit; whichever succeeds gets shown.
    const fetchKind = async (kind) => {
      const params = new URLSearchParams({ city: city.trim(), age: String(age || 30), kind });
      const response = await fetch(`/api/prices?${params}`);
      const data = await response.json().catch(() => null);
      if (!data) throw new Error('unavailable');
      if (!response.ok) throw new Error(data.error || 'Lookup failed.');
      return data;
    };

    const [transportResult, subsResult] = await Promise.allSettled([
      fetchKind('transport'),
      fetchKind('subscriptions'),
    ]);

    const ok = [transportResult, subsResult].filter((r) => r.status === 'fulfilled');

    if (ok.length === 0) {
      setState('error');
      setMessage(
        transportResult.reason?.message === 'unavailable'
          ? 'Price lookup needs the API running — use `vercel dev` locally, or the deployed site.'
          : 'Could not look up prices right now. Try again in a moment.'
      );
      return;
    }

    if (ok.some((r) => r.value.configured === false)) {
      setState('error');
      setMessage('Live prices are not configured.');
      return;
    }

    setResult({
      transport: transportResult.status === 'fulfilled' ? transportResult.value.transport : null,
      subscriptions: subsResult.status === 'fulfilled' ? subsResult.value.subscriptions || [] : [],
      partial: ok.length === 1,
    });
    setState('done');
  };

  const nothingFound =
    state === 'done' && !result?.subscriptions?.length && !result?.transport?.fares?.length;

  return (
    <div className="price-check">
      <div className="price-check-head">
        <h3>What things actually cost near you</h3>
        <p>
          The budget above uses typical estimates. This looks up today's real prices for your city,
          with a link to where each one came from.
        </p>
      </div>

      <form className="price-form" onSubmit={lookup}>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Your city"
          maxLength={60}
          aria-label="Your city"
        />
        <button type="submit" disabled={state === 'loading'}>
          {state === 'loading' ? 'Checking…' : 'Check prices'}
        </button>
      </form>

      {state === 'loading' && (
        <p className="price-status">Searching the web — this takes a few seconds.</p>
      )}
      {state === 'error' && <p className="price-error">{message}</p>}
      {nothingFound && (
        <p className="price-status">
          Nothing could be verified for {city} just now. It shows nothing rather than guessing.
        </p>
      )}

      {state === 'done' && result?.transport?.fares?.length > 0 && (
        <div className="price-block">
          <h4>Transport{result.transport.operator ? ` · ${result.transport.operator}` : ''}</h4>
          <ul className="price-list">
            {result.transport.fares.map((fare, i) => (
              <li key={i}>
                <span className="price-name">
                  {fare.name}
                  {fare.appliesTo && <em> · {fare.appliesTo}</em>}
                </span>
                <span className="price-value">
                  €{fare.price.toFixed(2)}
                  <small>/{fare.unit}</small>
                </span>
                {fare.sourceUrl && (
                  <a href={fare.sourceUrl} target="_blank" rel="noopener noreferrer">source</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state === 'done' && result?.subscriptions?.length > 0 && (
        <div className="price-block">
          <h4>Subscriptions</h4>
          <ul className="price-list">
            {result.subscriptions.map((sub, i) => (
              <li key={i}>
                <span className="price-name">
                  {sub.service}
                  {sub.plan && <em> · {sub.plan}</em>}
                </span>
                <span className="price-value">
                  {sub.currency}{sub.monthlyPrice.toFixed(2)}
                  <small>/month</small>
                </span>
                {sub.sourceUrl && (
                  <a href={sub.sourceUrl} target="_blank" rel="noopener noreferrer">source</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state === 'done' && result?.partial && (
        <p className="price-status">Part of the lookup timed out — showing what came back.</p>
      )}

      {state === 'done' && !nothingFound && (
        <p className="price-footnote">
          Found by searching the web, so check the source before relying on a figure.
        </p>
      )}
    </div>
  );
}

export default PriceCheck;
