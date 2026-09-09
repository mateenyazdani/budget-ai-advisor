const BASE = 'https://bankaccountdata.gocardless.com/api/v2';

// Access tokens last 24h. Cached per warm serverless instance; a cold start
// just fetches a new one.
let cachedToken = null;

class GoCardlessError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function isConfigured() {
  return Boolean(process.env.GOCARDLESS_SECRET_ID && process.env.GOCARDLESS_SECRET_KEY);
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.access;
  }

  const response = await fetch(`${BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      secret_id: process.env.GOCARDLESS_SECRET_ID,
      secret_key: process.env.GOCARDLESS_SECRET_KEY,
    }),
  });

  if (!response.ok) {
    throw new GoCardlessError('Could not authenticate with GoCardless.', 502);
  }

  const data = await response.json();
  cachedToken = {
    access: data.access,
    expiresAt: Date.now() + (data.access_expires ?? 86400) * 1000,
  };
  return cachedToken.access;
}

async function request(path, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    // Log upstream detail server-side only; it can echo identifiers back.
    console.error(`GoCardless ${path} failed`, response.status, detail.slice(0, 500));
    if (response.status === 404) throw new GoCardlessError('Not found.', 404);
    if (response.status === 429) throw new GoCardlessError('Rate limited by the bank provider.', 429);
    throw new GoCardlessError('The bank provider rejected the request.', 502);
  }

  return response.json();
}

function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

function normaliseTransaction(raw, status) {
  const amount = Number(raw.transactionAmount?.amount);
  const description =
    raw.remittanceInformationUnstructured ||
    (Array.isArray(raw.remittanceInformationUnstructuredArray)
      ? raw.remittanceInformationUnstructuredArray.join(' ')
      : '') ||
    raw.creditorName ||
    raw.debtorName ||
    'Transaction';

  return {
    id: raw.transactionId || raw.internalTransactionId || `${raw.bookingDate}-${raw.transactionAmount?.amount}`,
    date: raw.bookingDate || raw.valueDate || null,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: raw.transactionAmount?.currency || null,
    description: String(description).slice(0, 140),
    counterparty: raw.creditorName || raw.debtorName || null,
    direction: Number.isFinite(amount) && amount < 0 ? 'out' : 'in',
    status,
  };
}

module.exports = { request, isConfigured, appUrl, normaliseTransaction, GoCardlessError };
