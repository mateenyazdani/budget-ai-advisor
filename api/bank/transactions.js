const { request, isConfigured, normaliseTransaction, GoCardlessError } = require('../_lib/gocardless');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RETURNED = 200;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isConfigured()) {
    return res.status(503).json({ error: 'Bank connections are not configured.' });
  }

  const accountId = String(req.query.accountId || '');
  if (!UUID.test(accountId)) {
    return res.status(400).json({ error: 'A valid accountId is required.' });
  }

  try {
    const data = await request(`/accounts/${accountId}/transactions/`);
    const booked = (data.transactions?.booked || []).map((t) => normaliseTransaction(t, 'booked'));
    const pending = (data.transactions?.pending || []).map((t) => normaliseTransaction(t, 'pending'));

    const transactions = [...booked, ...pending]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, MAX_RETURNED);

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthTransactions = transactions.filter((t) => String(t.date || '').startsWith(thisMonth));

    const spent = monthTransactions
      .filter((t) => t.amount < 0)
      .reduce((total, t) => total + Math.abs(t.amount), 0);
    const received = monthTransactions
      .filter((t) => t.amount > 0)
      .reduce((total, t) => total + t.amount, 0);

    return res.status(200).json({
      transactions,
      summary: {
        month: thisMonth,
        spent: Number(spent.toFixed(2)),
        received: Number(received.toFixed(2)),
        count: monthTransactions.length,
        currency: transactions[0]?.currency || null,
      },
    });
  } catch (error) {
    const status = error instanceof GoCardlessError ? error.status : 502;
    return res.status(status).json({ error: error.message || 'Could not load transactions.' });
  }
};
