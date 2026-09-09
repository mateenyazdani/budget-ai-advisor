const { request, isConfigured, GoCardlessError } = require('../_lib/gocardless');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isConfigured()) {
    return res.status(503).json({ error: 'Bank connections are not configured.' });
  }

  const requisitionId = String(req.query.requisitionId || '');
  if (!UUID.test(requisitionId)) {
    return res.status(400).json({ error: 'A valid requisitionId is required.' });
  }

  try {
    const requisition = await request(`/requisitions/${requisitionId}/`);

    // LN = linked. Anything else means the user has not finished authorising.
    if (requisition.status !== 'LN' || !requisition.accounts?.length) {
      return res.status(200).json({ status: requisition.status, accounts: [] });
    }

    const accounts = await Promise.all(
      requisition.accounts.map(async (accountId) => {
        const [details, balances] = await Promise.all([
          request(`/accounts/${accountId}/details/`).catch(() => null),
          request(`/accounts/${accountId}/balances/`).catch(() => null),
        ]);

        const balance = balances?.balances?.[0];
        return {
          id: accountId,
          name: details?.account?.name || details?.account?.product || 'Account',
          iban: details?.account?.iban ? `•••• ${details.account.iban.slice(-4)}` : null,
          currency: details?.account?.currency || balance?.balanceAmount?.currency || null,
          balance: balance?.balanceAmount?.amount ? Number(balance.balanceAmount.amount) : null,
        };
      })
    );

    return res.status(200).json({ status: requisition.status, accounts });
  } catch (error) {
    const status = error instanceof GoCardlessError ? error.status : 502;
    return res.status(status).json({ error: error.message || 'Could not load accounts.' });
  }
};
