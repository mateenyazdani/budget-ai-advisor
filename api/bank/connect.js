const crypto = require('crypto');
const { request, isConfigured, appUrl, GoCardlessError } = require('../_lib/gocardless');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isConfigured()) {
    return res.status(503).json({
      error: 'Bank connections are not configured. Set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY.',
    });
  }

  const institutionId = String((req.body || {}).institutionId || '').trim();
  if (!/^[A-Z0-9_]{3,80}$/.test(institutionId)) {
    return res.status(400).json({ error: 'A valid institutionId is required.' });
  }

  const historicalDays = Math.min(Math.max(Number((req.body || {}).historicalDays) || 90, 1), 730);

  try {
    const agreement = await request('/agreements/enduser/', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: institutionId,
        max_historical_days: historicalDays,
        access_valid_for_days: 90,
        access_scope: ['balances', 'details', 'transactions'],
      }),
    });

    const requisition = await request('/requisitions/', {
      method: 'POST',
      body: JSON.stringify({
        redirect: `${appUrl()}/?bank=connected`,
        institution_id: institutionId,
        agreement: agreement.id,
        reference: crypto.randomUUID(),
        user_language: 'EN',
      }),
    });

    return res.status(200).json({ requisitionId: requisition.id, link: requisition.link });
  } catch (error) {
    const status = error instanceof GoCardlessError ? error.status : 502;
    return res.status(status).json({ error: error.message || 'Could not start the bank connection.' });
  }
};
