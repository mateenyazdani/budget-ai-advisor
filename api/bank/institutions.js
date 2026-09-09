const { request, isConfigured, GoCardlessError } = require('../_lib/gocardless');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isConfigured()) {
    return res.status(200).json({ configured: false, institutions: [] });
  }

  const country = String(req.query.country || 'ES').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return res.status(400).json({ error: 'country must be a two-letter code.' });
  }

  try {
    const data = await request(`/institutions/?country=${country}`);
    const institutions = (Array.isArray(data) ? data : []).map((bank) => ({
      id: bank.id,
      name: bank.name,
      logo: bank.logo || null,
      // How far back this bank will share history — varies a lot per bank.
      transactionDays: Number(bank.transaction_total_days) || 90,
    }));

    // Revolut first: it's the one this app was built around.
    institutions.sort((a, b) => {
      const aRev = a.name.toLowerCase().includes('revolut') ? 0 : 1;
      const bRev = b.name.toLowerCase().includes('revolut') ? 0 : 1;
      return aRev - bRev || a.name.localeCompare(b.name);
    });

    return res.status(200).json({ configured: true, institutions });
  } catch (error) {
    const status = error instanceof GoCardlessError ? error.status : 502;
    return res.status(status).json({ error: error.message || 'Could not load banks.' });
  }
};
