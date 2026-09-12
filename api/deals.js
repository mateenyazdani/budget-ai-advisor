const { searchJson, httpsUrlOrNull, resolveCountry, Anthropic } = require('./_lib/websearch');
const { rateLimited } = require('./_lib/ratelimit');

// Each lookup costs a Claude call plus web searches, so results are reused for
// an hour per city/category on a warm instance.
const CACHE_TTL_MS = 60 * 60 * 1000;
const EMPTY_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;
const cache = new Map();

const CATEGORIES = [
  'All', 'Dining', 'Coffee', 'Groceries', 'Takeaway', 'Nightlife',
  'Padel', 'Tennis', 'Gym', 'Swimming', 'Football', 'Climbing', 'Yoga', 'Golf',
  'Cinema', 'Museums', 'Bowling', 'Concerts',
  'Beauty', 'Spa', 'Dentist', 'Optician', 'Pharmacy',
  'Shopping', 'Electronics', 'Furniture', 'Books', 'Pets',
  'Hotels', 'Flights', 'CarHire', 'Trains', 'Travel',
  'SimCard', 'Broadband', 'Energy', 'Insurance', 'Streaming', 'Banking',
];
const CITY_PATTERN = /^[\p{L}\p{M}\s'’.,-]+$/u;

// A category label is written to read well on a button; a search needs the
// words people actually write when hunting for that deal. Searching the bare
// word "padel" found nothing, while "padel court booking offer" found eight.
const CATEGORY_QUERIES = {
  Dining: 'restaurant deals and discount menus',
  Groceries: 'supermarket offers and grocery discounts',
  Coffee: 'café and breakfast deals',
  Padel: 'padel court booking offers and discounts',
  Tennis: 'tennis court hire and club membership offers',
  Gym: 'gym membership deals and day passes',
  Shopping: 'clothing and retail discounts',
  Cinema: 'cinema ticket offers and discount days',
  Travel: 'hotel and travel deals',
  Nightlife: 'bar and nightlife drink offers',
  Beauty: 'hairdresser and beauty salon offers',
  Takeaway: 'takeaway and food delivery discount codes',
  Swimming: 'public swimming pool prices and passes',
  Football: 'five-a-side football pitch hire offers',
  Climbing: 'climbing wall day pass and membership offers',
  Yoga: 'yoga and pilates class packs and offers',
  Golf: 'golf green fee offers',
  Museums: 'museum free entry times and discounted tickets',
  Bowling: 'bowling offers and cheap games',
  Concerts: 'concert and gig ticket offers',
  Spa: 'spa day and massage offers',
  Dentist: 'dental check-up and cleaning offers',
  Optician: 'glasses and eye test offers',
  Pharmacy: 'pharmacy and parapharmacy discounts',
  Electronics: 'electronics and phone deals',
  Furniture: 'furniture and homeware sales',
  Books: 'bookshop discounts and offers',
  Pets: 'pet food and vet offers',
  Hotels: 'hotel deals and discount rates',
  Flights: 'cheap flight deals and airline offers',
  CarHire: 'car hire deals and discount codes',
  Trains: 'train and coach ticket offers and railcards',
  // No venue for these, so the search is the whole feature.
  SimCard: 'cheapest SIM only mobile plans and prepaid deals',
  Broadband: 'cheapest fibre broadband and internet deals',
  Energy: 'cheapest electricity and gas tariffs',
  Insurance: 'cheap car, home and travel insurance deals',
  Streaming: 'streaming subscription deals and bundle offers',
  Banking: 'bank account switching offers and fee-free accounts',
};
// A SIM plan or an insurance quote is the same offer in Valencia as in Madrid,
// so these are cached per country. One person's wait then serves everyone in
// the country rather than only the people in their city.
const NATIONAL = new Set([
  'SimCard', 'Broadband', 'Energy', 'Insurance', 'Streaming', 'Banking',
  'Flights', 'CarHire', 'Trains', 'Electronics', 'Books',
]);

// Free text goes into a prompt, so keep it to plain words and digits.
const QUERY_PATTERN = /^[\p{L}\p{M}\p{N}\s'’&+.,-]{2,60}$/u;

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  const ttl = hit.deals.length ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS;
  if (Date.now() - hit.at > ttl) {
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

// A price is only a price if it is a plain positive number. Anything else —
// "from 20", "20-30", null — is dropped rather than coerced, because a wrong
// figure on a price tag is worse than no figure.
function money(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value !== 'string') return null;
  const match = value.replace(',', '.').match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function cleanDeals(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d) => d && typeof d.merchant === 'string' && typeof d.offer === 'string')
    .slice(0, 12)
    .map((d) => {
      const priceBefore = money(d.priceBefore);
      const priceNow = money(d.priceNow);
      // The headline "61% off" is only ever computed from two real numbers that
      // were printed on the page. It is never taken from the model's own claim.
      const hasBoth = priceBefore !== null && priceNow !== null && priceBefore > priceNow && priceBefore > 0;
      return {
        merchant: String(d.merchant).slice(0, 80),
        offer: String(d.offer).slice(0, 160),
        detail: d.detail ? String(d.detail).slice(0, 220) : null,
        priceBefore: hasBoth ? priceBefore : null,
        priceNow: hasBoth ? priceNow : priceNow,
        discountPercent: hasBoth ? Math.round(((priceBefore - priceNow) / priceBefore) * 100) : null,
        unit: d.unit ? String(d.unit).slice(0, 24) : null,
        // A deal with no usable source is unverifiable, so the UI flags it.
        sourceUrl: httpsUrlOrNull(d.sourceUrl),
        sourceName: d.sourceName ? String(d.sourceName).slice(0, 60) : null,
        validity: d.validity ? String(d.validity).slice(0, 80) : null,
      };
    });
}

async function handler(req, res) {
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

  const scope = !query && NATIONAL.has(category) ? 'national' : city.toLowerCase();
  const cacheKey = `${scope}|${country.code}|${query ? `q:${query.toLowerCase()}` : category}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.status(200).json({ configured: true, deals: cached, cached: true });
  }

  // A category is just a query with a friendlier name. Treating it as one gives
  // it the stronger prompt and the page fetching that typed searches get —
  // without which a category browse finds almost nothing.
  const effectiveQuery = query || (category === 'All' ? null : CATEGORY_QUERIES[category] || category.toLowerCase());
  const focus = effectiveQuery || 'any everyday spending category';

  try {
    const parsed = await searchJson({
      city,
      countryCode: country.code,
      // Search snippets carry a headline like "up to 70% off" but rarely the
      // actual offer, so a typed search opens the pages it finds.
      maxUses: 4,
      // One successful search with three page fetches took 59.7 seconds against
      // a 60-second function limit. A search that hits the wall returns nothing
      // at all, which is worse than one that reads one page fewer.
      fetchUses: effectiveQuery ? 2 : 0,
      prompt: effectiveQuery
        ? `Find current deals, discounts and cheap options for "${effectiveQuery}" available to someone in ${city}, ${country.name}.`
        : `Find current money-saving offers in ${city}, ${country.name}.`,
      system: `You find real, currently-advertised money-saving offers people can actually use.

${effectiveQuery
  ? `The user is looking for: "${effectiveQuery}". They live in ${city}, ${country.name}.

Include nationwide and online offers as well as local ones — for SIM cards, broadband, insurance, subscriptions and most products, the best deal is usually a national or online one, and a country-wide offer is a correct answer. Only restrict to ${city} for things that are inherently local, such as a restaurant, gym or court booking.

Cheap standing prices count, not just limited-time discounts: if a provider simply offers the best rate, report it as the offer.`
  : `Search the web for offers in ${city}, ${country.name}, focused on ${focus}.`}
${NATIONAL.has(category) && !query
  ? `Go to the providers' own pages and to comparison sites. Coupon sites do not carry this kind of offer, so do not spend searches on them.`
  : `Search Groupon, Tiendeo, Ofertia and the merchants' own sites, as well as general results.`}

Hard rules:
- Only report an offer you actually found in a search result. Never invent one, never guess at a discount percentage, and never pad the list to look fuller.
- Every offer needs the URL of the page you found it on.
- Prefer offers from the merchant's own site or a well-known comparison or deals site.
- Report every real offer you find — a dozen is a good answer when a dozen are there. Return an empty array only if the searches genuinely turned up nothing usable.

Reply with only a JSON array, no prose around it. Each element:
{"merchant": string, "offer": string, "detail": string|null, "priceBefore": number|null, "priceNow": number|null, "unit": string|null, "validity": string|null, "sourceUrl": string, "sourceName": string}

"offer" is the saving itself, e.g. "2-for-1 on main courses".
"priceBefore" and "priceNow" are the old and new prices as plain numbers, and ONLY when the page actually prints both. If the page shows one price, put it in priceNow and leave priceBefore null. If it shows neither, leave both null. Never estimate a price, never work one backwards from a percentage, and never invent a "was" price to make a discount look bigger — a missing number is always the right answer when the page does not state it.
"unit" is what the price buys, e.g. "per month", "per hour", "per night".
"validity" is any stated expiry or condition, or null.`,
    });

    const deals = cleanDeals(parsed);
    if (parsed && deals.length === 0) {
      console.error('Parsed a reply but kept no deals (%s): %s', focus, JSON.stringify(parsed).slice(0, 300));
    }
    cacheSet(cacheKey, deals);

    return res.status(200).json({ configured: true, deals, cached: false });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    }
    // A spent API balance arrives as a generic 400. Left unnamed it looks like
    // the search is broken, and nobody would think to check the billing page.
    if (/credit balance is too low/i.test(error?.message || '')) {
      console.error('Deal search stopped: Anthropic credit exhausted.');
      return res.status(503).json({
        error: 'Offer search is paused — the account that pays for it is out of credit.',
        deals: [],
      });
    }
    console.error('Deal search failed:', error);
    return res.status(502).json({ error: 'Could not search for deals right now.' });
  }
}

// Browsing is the product now: thirty-odd categories to look through, one
// lookup each. Twelve an hour ran out before someone had seen a third of them.
module.exports = rateLimited({ endpoint: 'deals', limit: 40 }, handler);
