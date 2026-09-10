const { searchJson, httpsUrlOrNull, resolveCountry, Anthropic } = require('./_lib/websearch');
const { requireUser } = require('./_lib/auth');

// Subscription and fare prices move slowly, so a day of caching is plenty and
// keeps the cost of this endpoint near zero.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 60;
const cache = new Map();

const CITY_PATTERN = /^[\p{L}\p{M}\s'’.,-]+$/u;
const KINDS = ['transport', 'subscriptions'];

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key, data) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { data, at: Date.now() });
}

// Prices come back in many shapes: 13.99, "13,99", "€13.99", "13.99 EUR".
function money(value) {
  let n;
  if (typeof value === 'number') {
    n = value;
  } else {
    let s = String(value).trim();
    // "1,299.50" uses comma as a thousands separator; "13,99" as the decimal.
    s = s.includes(',') && s.includes('.') ? s.replace(/,/g, '') : s.replace(',', '.');
    const match = s.match(/\d+(\.\d+)?/);
    if (!match) return null;
    n = parseFloat(match[0]);
  }
  return Number.isFinite(n) && n >= 0 && n < 10000 ? Number(n.toFixed(2)) : null;
}

function cleanSubscriptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s.service === 'string' && money(s.monthlyPrice) !== null)
    .slice(0, 12)
    .map((s) => ({
      service: String(s.service).slice(0, 40),
      plan: s.plan ? String(s.plan).slice(0, 60) : null,
      monthlyPrice: money(s.monthlyPrice),
      currency: s.currency ? String(s.currency).slice(0, 4) : '€',
      sourceUrl: httpsUrlOrNull(s.sourceUrl),
    }));
}

function cleanTransport(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const fares = Array.isArray(raw.fares) ? raw.fares : [];
  const cleaned = fares
    .filter((f) => f && typeof f.name === 'string' && money(f.price) !== null)
    .slice(0, 10)
    .map((f) => ({
      name: String(f.name).slice(0, 120),
      price: money(f.price),
      unit: ['ride', 'ticket', 'month'].includes(f.unit) ? f.unit : 'month',
      appliesTo: f.appliesTo ? String(f.appliesTo).slice(0, 60) : null,
      sourceUrl: httpsUrlOrNull(f.sourceUrl),
    }));
  if (!cleaned.length) return null;
  return { operator: raw.operator ? String(raw.operator).slice(0, 100) : null, fares: cleaned };
}

const SHARED_RULES = `Hard rules:
- Report only prices you actually found in search results. Never estimate, never convert from another country, and never carry over a price you remember.
- Prefer the operator's or provider's own site.
- Omit anything you could not verify. A short, accurate list beats a long, guessed one.`;

function transportPrompt(city, country, age, ageBand) {
  return {
    prompt: `Find the current public transport fares in ${city}, ${country.name} for someone aged ${age}.`,
    system: `You look up real, current public transport fares for a specific city and report them with sources.

Find, from the transport operator for ${city}, ${country.name}: the single-ride fare, any multi-trip or travel-card fare, and the monthly pass. Include any age-based discount that applies to someone aged ${age} (${ageBand}), such as a youth or senior pass.

${SHARED_RULES}

Reply with only a JSON object, no prose:
{"operator": string, "fares": [{"name": string, "price": number, "unit": "ride"|"ticket"|"month", "appliesTo": string|null, "sourceUrl": string}]}

"unit" is what the price buys: "ride" for one journey, "ticket" for a multi-trip ticket priced as a whole, "month" for a pass. A 10-trip ticket costing 7.30 in total is {"price": 7.30, "unit": "ticket"}, never a per-ride price.
"appliesTo" names the eligibility, e.g. "under 26", or null if it applies to everyone.`,
  };
}

function subscriptionsPrompt(city, country) {
  return {
    prompt: `Find the current monthly subscription prices in ${country.name}.`,
    system: `You look up real, current consumer subscription prices for a country and report them with sources.

Find the current monthly prices in ${country.name}, in local currency, for Netflix, Spotify and Apple iCloud+. Give the standard individual plan unless a cheaper one is the obvious default.

Report each service as soon as you have found its price. Returning two verified prices is better than returning none because the third could not be confirmed.

${SHARED_RULES}

Reply with only a JSON object, no prose:
{"subscriptions": [{"service": string, "plan": string, "monthlyPrice": number, "currency": string, "sourceUrl": string}]}`,
  };
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      configured: false,
      subscriptions: [],
      transport: null,
      message: 'Live prices need ANTHROPIC_API_KEY to be set.',
    });
  }

  const city = String(req.query.city || '').trim().slice(0, 60);
  if (!city || !CITY_PATTERN.test(city)) {
    return res.status(400).json({ error: 'A valid city is required.' });
  }

  // Each topic is its own request: doing both in one call exceeded the
  // platform's 60s function limit, so the client fetches them in parallel.
  const kind = KINDS.includes(req.query.kind) ? req.query.kind : 'transport';
  const country = resolveCountry(req.query.country || 'ES');
  const age = Math.min(Math.max(parseInt(req.query.age, 10) || 30, 14), 100);
  const ageBand = age < 26 ? 'under 26' : age < 31 ? '26 to 30' : age < 65 ? '31 to 64' : '65 or over';

  const cacheKey =
    kind === 'subscriptions'
      ? `subs|${country.code}`
      : `transport|${city.toLowerCase()}|${country.code}|${ageBand}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.status(200).json({ configured: true, ...cached, cached: true });
  }

  const { prompt, system } =
    kind === 'subscriptions'
      ? subscriptionsPrompt(city, country)
      : transportPrompt(city, country, age, ageBand);

  try {
    const parsed = await searchJson({
      city,
      countryCode: country.code,
      // Subscription prices sit on JS-heavy pages that search snippets miss,
      // so that lookup fetches pages; both budgets are sized to fit the 60s
      // function limit.
      maxUses: kind === 'subscriptions' ? 4 : 4,
      fetchUses: kind === 'subscriptions' ? 3 : 0,
      prompt,
      system,
    });

    const data =
      kind === 'subscriptions'
        ? { subscriptions: cleanSubscriptions(parsed?.subscriptions ?? parsed) }
        : { transport: cleanTransport(parsed?.transport ?? parsed), ageBand };

    const kept = kind === 'subscriptions' ? data.subscriptions.length : data.transport?.fares.length || 0;
    if (parsed && kept === 0) {
      console.error('Parsed a reply but kept nothing (%s): %s', kind, JSON.stringify(parsed).slice(0, 400));
    }

    cacheSet(cacheKey, data);
    return res.status(200).json({ configured: true, ...data, cached: false });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    }
    console.error(`Price lookup (${kind}) failed:`, error);
    return res.status(502).json({ error: 'Could not look up prices right now.' });
  }
}

module.exports = requireUser(
  { endpoint: 'prices', limit: 8, window: '1 hour' },
  handler,
);
