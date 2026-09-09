const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

function isAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Returns the signed-in user for a request, or null. The token is verified by
// Supabase, so a forged one gets nothing.
async function getUser(req) {
  if (!isAuthConfigured()) return null;

  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;

  return { user: data.user, client };
}

// Counting happens inside a security-definer function, so the caller can never
// reach the usage table directly to reset their own count.
async function withinRateLimit(client, userId, endpoint, limit, windowInterval) {
  const { data, error } = await client.rpc('check_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_limit: limit,
    p_window: windowInterval,
  });

  if (error) {
    // Failing open would defeat the point of having a limit at all.
    console.error('Rate limit check failed:', error.message);
    return false;
  }
  return data === true;
}

// Wraps a handler so it requires a signed-in user and stays within its budget.
function requireUser({ endpoint, limit, window: windowInterval }, handler) {
  return async (req, res) => {
    if (!isAuthConfigured()) {
      return res.status(503).json({ error: 'Accounts are not configured.' });
    }

    const auth = await getUser(req);
    if (!auth) {
      return res.status(401).json({ error: 'Sign in to use this.' });
    }

    const allowed = await withinRateLimit(auth.client, auth.user.id, endpoint, limit, windowInterval);
    if (!allowed) {
      return res.status(429).json({
        error: 'You have used this a lot in a short time. Try again a bit later.',
      });
    }

    return handler(req, res, auth);
  };
}

module.exports = { requireUser, getUser, isAuthConfigured };
