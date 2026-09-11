// Caps how often one caller can trigger a paid lookup.
//
// Deliberately does not require a signed-in user: gating these endpoints behind
// auth broke them in a way that could not be told apart from abuse, and a
// protection that silently kills the feature is worse than a weaker one that
// cannot. Counting is per warm instance, so it is a ceiling on sustained abuse
// rather than a precise quota — which is all that is needed to protect a bill.

const WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED = 500;

const hits = new Map();

function callerKey(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded || '')
    .split(',')[0]
    .trim();
  return ip || req.headers?.['x-real-ip'] || 'unknown';
}

function prune(now) {
  for (const [key, times] of hits) {
    const recent = times.filter((t) => now - t < WINDOW_MS);
    if (recent.length) hits.set(key, recent);
    else hits.delete(key);
  }
  // Under a flood of unique keys, drop the oldest rather than grow without end.
  while (hits.size > MAX_TRACKED) {
    hits.delete(hits.keys().next().value);
  }
}

// Wraps a handler with an hourly cap per caller.
function rateLimited({ endpoint, limit }, handler) {
  return async (req, res) => {
    const now = Date.now();
    const key = `${endpoint}:${callerKey(req)}`;

    prune(now);
    const times = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);

    if (times.length >= limit) {
      const oldest = times[0];
      const minutes = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 60000));
      res.setHeader('Retry-After', String(minutes * 60));
      return res.status(429).json({
        error: `That is ${limit} lookups in an hour, which is the limit. Try again in about ${minutes} minutes.`,
      });
    }

    times.push(now);
    hits.set(key, times);
    return handler(req, res);
  };
}

module.exports = { rateLimited };
