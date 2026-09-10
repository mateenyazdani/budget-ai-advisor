import { supabase } from './supabase';

// The endpoints that cost money require a signed-in user, so every call to them
// carries the session token. Supabase verifies it server-side.
export async function authedFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}
