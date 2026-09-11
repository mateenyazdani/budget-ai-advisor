import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseStatement, summarise } from '../lib/csvImport';
import { sampleStatementCsv } from '../lib/sampleStatement';
import { importTransactions } from '../lib/budgetStore';
import {
  findRecurring, comparePlan, suggestAdjustment, applyRules, saveRule,
} from '../lib/statementAnalysis';
import '../styles/BankConnect.css';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function BankConnect({ budget }) {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('');
  const [dragging, setDragging] = useState(false);
  const [recurring, setRecurring] = useState([]);
  const [planRows, setPlanRows] = useState([]);
  const [adjustment, setAdjustment] = useState(null);
  const [recategorising, setRecategorising] = useState(null);
  const inputRef = useRef(null);

  const budgetCategories = budget?.categories || {};
  const categoryNames = Object.keys(budgetCategories).sort();

  const analyse = (list, monthsCovered) => {
    const withRules = applyRules(list);
    const totals = {};
    for (const t of withRules) {
      if (t.amount >= 0) continue;
      totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
    }
    const byCategory = Object.entries(totals)
      .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total);

    const rows = comparePlan(byCategory, budgetCategories, monthsCovered);
    setTransactions(withRules);
    setRecurring(findRecurring(withRules));
    setPlanRows(rows);
    setAdjustment(suggestAdjustment(rows, budget?.surplus ?? 0));
    return withRules;
  };

  const correctCategory = (transaction, category) => {
    saveRule(transaction.description, category);
    setRecategorising(null);
    const months = Math.max(summary?.monthsCovered || 1, 1);
    analyse(transactions.map((t) => (t.externalId === transaction.externalId ? { ...t, category } : t)), months);
  };

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

    const monthsCovered = Math.max(
      new Set(result.transactions.map((t) => t.date.slice(0, 7))).size, 1
    );
    const analysed = analyse(result.transactions, monthsCovered);
    setSummary({ ...summarise(analysed), monthsCovered });

    setSaveState('saving');
    const { saved, skipped, error: saveError } = await importTransactions(analysed);
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

  const trySample = () => {
    handleFile(new File([sampleStatementCsv()], 'sample-statement.csv', { type: 'text/csv' }));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const currency = summary?.currency === 'EUR' ? '€' : summary?.currency || '€';

  return (
    <div className="bank-container">
      <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>
      <h2>Planned versus actual</h2>

      <p className="bank-intro">
        Everything else in this app is an estimate. This is the one place it meets your real money:
        drop in a statement and see what you actually spent against what you planned, what you are
        quietly paying every month, and what to change. The file is read in your browser and never
        uploaded.
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

          <button type="button" className="try-sample" onClick={trySample}>
            Try it with a sample statement
            <span>Three months of realistic transactions. Nothing of yours is used.</span>
          </button>

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

          {adjustment && (
            <div className="finding headline-finding">
              <span className="finding-badge">Change this</span>
              <p>
                <strong>{adjustment.category}</strong> came to {currency}{adjustment.actual.toFixed(0)} a
                month against a plan of {currency}{adjustment.planned.toFixed(0)}. Bringing it to{' '}
                {currency}{adjustment.target} would free {currency}{adjustment.saving} a month
                {adjustment.closesDeficit ? ' — enough on its own to stop the shortfall.' : '.'}
              </p>
            </div>
          )}

          {recurring.length > 0 && (
            <>
              <h3 className="section-heading">Paid every month</h3>
              <p className="guess-note">
                Charges that repeated across months for the same amount. Worth checking you still
                want all of them.
              </p>
              <div className="recurring-list">
                {recurring.map((r) => (
                  <div key={r.key} className="recurring-row">
                    <span className="recurring-name">{r.name}</span>
                    <span className="recurring-seen">seen {r.seen}×</span>
                    <span className="recurring-amount">{currency}{r.amount.toFixed(2)}/mo</span>
                    <span className="recurring-yearly">{currency}{r.yearly.toFixed(0)} a year</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 className="section-heading">Planned versus actual</h3>
          <p className="guess-note">
            {summary.monthsCovered > 1
              ? `Averaged over the ${summary.monthsCovered} months in this file.`
              : 'Categories are guessed from the description — correct any that are wrong below.'}
          </p>

          <div className="category-compare">
            {planRows.map((row) => (
              <div key={row.category} className={`compare-row ${row.hot ? 'hot' : ''}`}>
                <span className="compare-name">
                  {row.category}
                  {row.hot && <span className="hot-flag">running hot</span>}
                </span>
                <span className="compare-actual">{currency}{row.actual.toFixed(2)}</span>
                {row.planned !== null ? (
                  <span className={`compare-plan ${row.difference > 0 ? 'over' : 'under'}`}>
                    {row.difference > 0 ? '▲' : '▼'} {currency}{Math.abs(row.difference).toFixed(2)}{' '}
                    {row.difference > 0 ? 'over' : 'under'} the {currency}{row.planned} you planned
                  </span>
                ) : (
                  <span className="compare-plan none">nothing planned for this</span>
                )}
              </div>
            ))}
          </div>

          <h3 className="section-heading">Transactions</h3>
          <div className="transaction-list">
            {transactions.slice(0, 100).map((t) => (
              <div key={t.externalId} className="transaction-row">
                <div className="transaction-main">
                  <span className="transaction-desc">{t.description}</span>
                  {t.direction === 'out' ? (
                    recategorising === t.externalId ? (
                      <select
                        className="recat-select"
                        autoFocus
                        defaultValue={t.category}
                        onChange={(e) => correctCategory(t, e.target.value)}
                        onBlur={() => setRecategorising(null)}
                      >
                        {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <button className="recat-button" onClick={() => setRecategorising(t.externalId)}>
                        {t.date} · {t.category}
                        {t.corrected && <span className="recat-mark"> · fixed</span>}
                      </button>
                    )
                  ) : (
                    <span className="transaction-date">{t.date} · money in</span>
                  )}
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
