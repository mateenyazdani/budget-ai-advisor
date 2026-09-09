import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseStatement, summarise } from '../lib/csvImport';
import { importTransactions } from '../lib/budgetStore';
import '../styles/BankConnect.css';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function BankConnect({ budget }) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    setError('');
    setSaveState('');

    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is larger than 5 MB. Export a shorter date range.');
      return;
    }

    const text = await file.text();
    const result = parseStatement(text);

    if (result.error) {
      setError(result.error);
      setTransactions([]);
      setSummary(null);
      return;
    }

    setTransactions(result.transactions);
    setSummary(summarise(result.transactions));

    setSaveState('saving');
    const { saved, skipped, error: saveError } = await importTransactions(result.transactions);
    if (saveError) {
      setSaveState('');
      setError('Read the file, but could not save it to your account.');
      return;
    }
    setSaveState(
      skipped > 0
        ? `Saved ${saved} new transactions. ${skipped} were already there.`
        : `Saved ${saved} transactions to your account.`
    );
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const budgeted = (category) => {
    const value = budget?.categories?.[category];
    return typeof value === 'number' ? value : null;
  };

  const currency = summary?.currency === 'EUR' ? '€' : summary?.currency || '€';

  return (
    <div className="bank-container">
      <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>
      <h2>🏦 Your real spending</h2>

      <p className="bank-intro">
        Export a statement from your bank and drop it here to see what you actually spent against
        your budget. Nothing is sent to a third party — the file is read in your browser and the
        transactions are saved to your account.
      </p>

      {!summary && (
        <>
          <div
            className={`drop-zone ${dragging ? 'active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          >
            <span className="drop-icon" aria-hidden="true">📄</span>
            <strong>Drop your statement here</strong>
            <span className="drop-hint">or click to choose a file — CSV from any bank</span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,text/csv,text/plain"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="export-help">
            <h4>Getting the file from Revolut</h4>
            <ol>
              <li>Open the Revolut app</li>
              <li>Tap your account, then <strong>Statement</strong></li>
              <li>Choose <strong>Excel/CSV</strong>, pick a date range</li>
              <li>Save it, then drop it here</li>
            </ol>
            <p className="export-note">
              Most other banks work too — anything with a date, description and amount column.
            </p>
          </div>
        </>
      )}

      {error && <div className="bank-error">{error}</div>}
      {saveState && saveState !== 'saving' && <div className="save-note">{saveState}</div>}
      {saveState === 'saving' && <div className="bank-status">Saving to your account…</div>}

      {summary && (
        <>
          <div className="bank-summary">
            <div>
              <label>Spent</label>
              <p className="out">{currency}{summary.spent.toFixed(2)}</p>
            </div>
            <div>
              <label>Received</label>
              <p className="in">{currency}{summary.received.toFixed(2)}</p>
            </div>
            <div>
              <label>Transactions</label>
              <p>{summary.count}</p>
            </div>
            <div>
              <label>Period</label>
              <p className="period">{summary.from} → {summary.to}</p>
            </div>
          </div>

          <h3 className="section-heading">Where it actually went</h3>
          <p className="guess-note">
            Categories are guessed from the description, so check anything that looks off.
          </p>

          <div className="category-compare">
            {summary.byCategory.map((row) => {
              const plan = budgeted(row.category);
              const over = plan !== null && row.total > plan;
              return (
                <div key={row.category} className="compare-row">
                  <span className="compare-name">{row.category}</span>
                  <span className="compare-actual">{currency}{row.total.toFixed(2)}</span>
                  {plan !== null ? (
                    <span className={`compare-plan ${over ? 'over' : 'under'}`}>
                      {over ? '▲' : '▼'} {currency}{Math.abs(row.total - plan).toFixed(2)}{' '}
                      {over ? 'over' : 'under'} the {currency}{plan} you budgeted
                    </span>
                  ) : (
                    <span className="compare-plan none">not in your budget</span>
                  )}
                </div>
              );
            })}
          </div>

          <h3 className="section-heading">Transactions</h3>
          <div className="transaction-list">
            {transactions.slice(0, 100).map((t) => (
              <div key={t.externalId} className="transaction-row">
                <div className="transaction-main">
                  <span className="transaction-desc">{t.description}</span>
                  <span className="transaction-date">
                    {t.date}{t.direction === 'out' ? ` · ${t.category}` : ' · money in'}
                  </span>
                </div>
                <span className={`transaction-amount ${t.direction}`}>
                  {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <button className="btn-disconnect" onClick={() => { setSummary(null); setTransactions([]); setSaveState(''); }}>
            Upload another statement
          </button>
        </>
      )}

      <details className="provider-note">
        <summary>Why not connect automatically?</summary>
        <p>
          Reading bank accounts directly is regulated under PSD2 and needs a licensed provider.
          GoCardless closed its free tier to new signups, and the remaining providers start at
          a few hundred a month, so uploading a statement is the honest option for now. The code
          for a live connection is still in the project if that changes.
        </p>
      </details>
    </div>
  );
}

export default BankConnect;
