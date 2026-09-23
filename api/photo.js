// A real photo instead of an emoji, without ever putting the Google API key
// in front of a browser. The client only ever sees a Google place photo's
// opaque resource name (e.g. "places/ABC/photos/XYZ"), passed here as `ref`;
// this endpoint asks Google for the real image URL server-side and redirects
// the browser straight to it, so the actual bytes come from Google's own CDN
// rather than being proxied twice through this function.

const REF_PATTERN = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

// A cache-per-instance is enough here: the same restaurant card is requested
// repeatedly within a session, and Google's photoUri itself is only valid for
// a short window, so nothing here is cached beyond one warm instance's life.
const cache = new Map();
const CACHE_TTL_MS = 50 * 60 * 1000; // just under the ~1hr the URL stays valid
const MAX_CACHE_ENTRIES = 200;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return res.status(404).json({ error: 'Photos are not configured.' });

  const ref = String(req.query.ref || '');
  if (!REF_PATTERN.test(ref)) {
    return res.status(400).json({ error: 'Invalid photo reference.' });
  }

  // A fixed small set of widths, so this can never be used to make Google
  // Places generate and bill for arbitrary image sizes on request.
  const width = ['400', '800', '1200'].includes(String(req.query.w)) ? String(req.query.w) : '800';

  const cacheKey = `${ref}|${width}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=3000');
    return res.redirect(302, cached.url);
  }

  try {
    const mediaRes = await fetch(
      `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${width}&key=${apiKey}&skipHttpRedirect=true`
    );
    if (!mediaRes.ok) {
      return res.status(502).json({ error: 'Could not reach the photo.' });
    }
    const data = await mediaRes.json();
    if (!data.photoUri) return res.status(502).json({ error: 'No photo URL returned.' });

    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, { url: data.photoUri, at: Date.now() });

    res.setHeader('Cache-Control', 'public, max-age=3000');
    return res.redirect(302, data.photoUri);
  } catch (error) {
    console.error('Photo proxy failed:', error);
    return res.status(502).json({ error: 'Could not reach the photo service.' });
  }
};
