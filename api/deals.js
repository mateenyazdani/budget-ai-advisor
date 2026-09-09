const { searchJson, httpsUrlOrNull, resolveCountry, Anthropic } = require('./_lib/websearch');

// Each lookup costs a Claude call plus web searches, so results are reused for
// an hour per city/category on a warm instance.
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;
const cache = new Map();

const CATEGORIES = ['All', 'Dining', 'Groceries', 'Coffee', 'Padel', 'Gym', 'Shopping'];
const CITY_PATTERN = /^[\p{L}\p{M}\s'’.,-]+$/u;
// Free text goes into a prompt, so keep it to plain words and digits.
const QUERY_PATTERN = /^[\p{L}\p{M}\p{N}\s'’&+.,-]{2,60}$/u;

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.deals;
}

function cacheSet(key, deals) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, { deals, at: Date.now() });
}

function cleanDeals(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d) => d && typeof d.merchant === 'string' && typeof d.offer === 'string')
    .slice(0, 12)
    .map((d) => ({
      merchant: String(d.merchant).slice(0, 80),
      offer: String(d.offer).slice(0, 160),
      detail: d.detail ? String(d.detail).slice(0, 220) : null,
      // A deal with no usable source is unverifiable, so the UI flags it.
      sourceUrl: httpsUrlOrNull(d.sourceUrl),
      sourceName: d.sourceName ? String(d.sourceName).slice(0, 60) : null,
      validity: d.validity ? String(d.validity).slice(0, 80) : null,
    }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({
      configured: false,
      deals: [],
      message: 'Live deals need ANTHROPIC_API_KEY to be set.',
    });
  }

  const city = String(req.query.city || '').trim().slice(0, 60);
  if (!city || !CITY_PATTERN.test(city)) {
    return res.status(400).json({ error: 'A valid city is required.' });
  }

  const country = resolveCountry(req.query.country || 'ES');
  const category = CATEGORIES.includes(req.query.category) ? req.query.category : 'All';

  // A typed search wins over the category buttons when present.
  const rawQuery = String(req.query.query || '').trim().slice(0, 60);
  const query = rawQuery && QUERY_PATTERN.test(rawQuery) ? rawQuery : null;
  if (rawQuery && !query) {
    return res.status(400).json({ error: 'Search for a product or service in plain words.' });
  }

  const cacheKey = `${city.toLowerCase()}|${country.code}|${query ? `q:${query.toLowerCase()}` : category}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.status(200).json({ configured: true, deals: cached, cached: true });
  }

  const focus = query || (category === 'All' ? 'any everyday spending category' : category.toLowerCase());

  try {
    const parsed = await searchJson({
      city,
      countryCode: country.code,
      prompt: query
        ? `Find current deals, discounts and cheap options for "${query}" available to someone in ${city}, ${country.name}.`
        : `Find current money-saving offers in ${city}, ${country.name} for ${focus}.`,
      system: `You find real, currently-advertised money-saving offers people can actually use.

${query
  ? `The user is looking for: "${query}". They live in ${city}, ${country.name}.

Include nationwide and online offers as well as local ones — for SIM cards, broadband, insurance, subscriptions and most products, the best deal is usually a national or online one, and a country-wide offer is a correct answer. Only restrict to ${city} for things that are inherently local, such as a restaurant, gym or court booking.

Cheap standing prices count, not just limited-time discounts: if a provider simply offers the best rate, report it as the offer.`
  : `Search the web for offers in ${city}, ${country.name}, focused on ${focus}.`}
Search Groupon, Tiendeo, Ofertia and the merchants' own sites, as well as general results.
Offers may be online-only rather than tied to a shop — for things like SIM cards, broadband or insurance, a nationwide deal is a good answer.

Hard rules:
- Only report an offer you actually found in a search result. Never invent one, never guess at a discount percentage, and never pad the list to look fuller.
- Every offer needs the URL of the page you found it on.
- Prefer offers from the merchant's own site or a well-known local deals site.
- If you cannot find real offers, return an empty array. An empty array is a correct answer.

Reply with only a JSON array, no prose around it. Each element:
{"merchant": string, "offer": string, "detail": string|null, "validity": string|null, "sourceUrl": string, "sourceName": string}

"offer" is the saving itself, e.g. "2-for-1 on main courses". "validity" is any stated expiry or condition, or null.`,
    });

    const deals = cleanDeals(parsed);
    cacheSet(cacheKey, deals);

    return res.status(200).json({ configured: true, deals, cached: false });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    }
    console.error('Deal search failed:', error);
    return res.status(502).json({ error: 'Could not search for deals right now.' });
  }
};
