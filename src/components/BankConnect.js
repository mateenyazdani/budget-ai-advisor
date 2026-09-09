import React, { useState, useEffect, useCallback } from 'react';
import '../styles/BankConnect.css';

const REQUISITION_KEY = 'bankRequisitionId';

const COUNTRIES = [
  { code: 'ES', label: '🇪🇸 Spain' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'IE', label: '🇮🇪 Ireland' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'FR', label: '🇫🇷 France' },
];

function BankConnect({ onBack }) {
  const [country, setCountry] = useState('ES');
  const [institutions, setInstitutions] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const requisitionId = localStorage.getItem(REQUISITION_KEY);

  const loadAccounts = useCallback(async () => {
    if (!requisitionId) return;
    setLoading('accounts');
    setError('');
    try {
      const response = await fetch(`/api/bank/accounts?requisitionId=${encodeURIComponent(requisitionId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load accounts.');

      if (!data.accounts.length) {
        setError(
          data.status === 'CR'
            ? 'The connection was started but not finished. Connect your bank again to complete it.'
            : 'No accounts are linked to this connection yet.'
        );
      }
      setAccounts(data.accounts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }, [requisitionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading('banks');
      try {
        const response = await fetch(`/api/bank/institutions?country=${country}`);
        const data = await response.json();
        if (cancelled) return;
        if (data.configured === false) {
          setConfigured(false);
          return;
        }
        setInstitutions(data.institutions || []);
      } catch {
        if (!cancelled) setError('Could not load the bank list.');
      } finally {
        if (!cancelled) setLoading('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleConnect = async (institutionId) => {
    setLoading('connect');
    setError('');
    try {
      const response = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start the connection.');

      localStorage.setItem(REQUISITION_KEY, data.requisitionId);
      window.location.href = data.link;
    } catch (err) {
      setError(err.message);
      setLoading('');
    }
  };

  const handleSelectAccount = async (account) => {
    setSelectedAccount(account);
    setLoading('transactions');
    setError('');
    try {
      const response = await fetch(`/api/bank/transactions?accountId=${encodeURIComponent(account.id)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load transactions.');
      setTransactions(data.transactions);
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem(REQUISITION_KEY);
    setAccounts([]);
    setSelectedAccount(null);
    setTransactions([]);
    setSummary(null);
  };

  if (!configured) {
    return (
      <div className="bank-container">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2>🏦 Connect your bank</h2>
        <div className="bank-setup">
          <p>Bank connections are not configured yet.</p>
          <p>
            Create a free account at <strong>bankaccountdata.gocardless.com</strong>, generate a
            secret ID and key, then set <code>GOCARDLESS_SECRET_ID</code> and{' '}
            <code>GOCARDLESS_SECRET_KEY</code> in your environment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bank-container">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <h2>🏦 Connect your bank</h2>

      {error && <div className="bank-error">{error}</div>}

      {accounts.length === 0 ? (
        <>
          <p className="bank-intro">
            Revolut does not open its accounts to apps directly. This connects through GoCardless,
            which is a regulated account information provider, so your bank login is entered on your
            bank's own page and never in this app.
          </p>

          <label className="bank-country">
            Country
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </label>

          {loading === 'banks' && <p className="bank-status">Loading banks…</p>}

          <div className="bank-list">
            {institutions.map((bank) => (
              <button
                key={bank.id}
                className="bank-option"
                onClick={() => handleConnect(bank.id)}
                disabled={loading === 'connect'}
              >
                {bank.logo && <img src={bank.logo} alt="" />}
                <span className="bank-name">{bank.name}</span>
                <span className="bank-days">{bank.transactionDays} days history</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="bank-accounts">
            {accounts.map((account) => (
              <button
                key={account.id}
                className={`account-card ${selectedAccount?.id === account.id ? 'active' : ''}`}
                onClick={() => handleSelectAccount(account)}
              >
                <span className="account-name">{account.name}</span>
                {account.iban && <span className="account-iban">{account.iban}</span>}
                {account.balance !== null && (
                  <span className="account-balance">
                    {account.currency} {account.balance.toFixed(2)}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button className="btn-disconnect" onClick={handleDisconnect}>Disconnect</button>

          {loading === 'transactions' && <p className="bank-status">Loading transactions…</p>}

          {summary && (
            <div className="bank-summary">
              <div>
                <label>Spent this month</label>
                <p className="out">{summary.currency} {summary.spent.toFixed(2)}</p>
              </div>
              <div>
                <label>Received</label>
                <p className="in">{summary.currency} {summary.received.toFixed(2)}</p>
              </div>
              <div>
                <label>Transactions</label>
                <p>{summary.count}</p>
              </div>
            </div>
          )}

          {transactions.length > 0 && (
            <div className="transaction-list">
              {transactions.map((t) => (
                <div key={t.id} className="transaction-row">
                  <div className="transaction-main">
                    <span className="transaction-desc">{t.description}</span>
                    <span className="transaction-date">
                      {t.date}{t.status === 'pending' ? ' · pending' : ''}
                    </span>
                  </div>
                  <span className={`transaction-amount ${t.direction}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)} {t.currency}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BankConnect;
