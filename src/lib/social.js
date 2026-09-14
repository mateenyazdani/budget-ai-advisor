import { supabase } from './supabase';

// Usernames are the address of a person in this app, so they have to be
// predictable to type: lowercase, no spaces, no punctuation to get wrong.
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normaliseUsername(raw) {
  return (raw || '').trim().toLowerCase().replace(/^@/, '');
}

export function usernameError(raw) {
  const name = normaliseUsername(raw);
  if (!name) return 'Pick a username.';
  if (name.length < 3) return 'At least 3 characters.';
  if (name.length > 20) return 'At most 20 characters.';
  if (!USERNAME_RE.test(name)) return 'Letters, numbers and underscores only.';
  return null;
}

export async function getProfile(userId) {
  if (!supabase || !userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_emoji, home_country')
    .eq('id', userId)
    .maybeSingle();
  return data || null;
}

// Returns { ok } or { error } — the unique index on lower(username) is what
// actually decides, so a race between two people claiming @marta is settled by
// Postgres rather than by a check that passed a moment ago.
export async function claimUsername(userId, raw, extra = {}) {
  const problem = usernameError(raw);
  if (problem) return { error: problem };

  const { error } = await supabase
    .from('profiles')
    .update({ username: normaliseUsername(raw), ...extra })
    .eq('id', userId);

  if (error) {
    return { error: error.code === '23505' ? 'That username is taken.' : error.message };
  }
  return { ok: true };
}

export async function searchUsers(term, selfId) {
  const query = normaliseUsername(term);
  if (query.length < 2) return [];

  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_emoji, home_country')
    .ilike('username', `%${query}%`)
    .neq('id', selfId)
    .limit(20);

  return data || [];
}

export async function follow(followingId) {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth?.user?.id;
  if (!me) return { error: 'Not signed in.' };
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: me, following_id: followingId });
  // Following twice is not an error worth showing anyone.
  if (error && error.code !== '23505') return { error: error.message };
  return { ok: true };
}

export async function unfollow(followingId) {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth?.user?.id;
  if (!me) return { error: 'Not signed in.' };
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', me)
    .eq('following_id', followingId);
  return error ? { error: error.message } : { ok: true };
}

// One round trip for the whole graph, then the three lists are worked out here.
// Following someone who follows you back is a friend; the two half-states are
// what the Friends screen needs in order to explain itself.
export async function loadGraph(selfId) {
  if (!supabase || !selfId) {
    return { friends: [], following: [], followers: [], profiles: {} };
  }

  const { data: edges } = await supabase
    .from('follows')
    .select('follower_id, following_id');

  const outgoing = new Set();
  const incoming = new Set();
  for (const edge of edges || []) {
    if (edge.follower_id === selfId) outgoing.add(edge.following_id);
    if (edge.following_id === selfId) incoming.add(edge.follower_id);
  }

  const everyone = [...new Set([...outgoing, ...incoming])];
  let profiles = {};
  if (everyone.length) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji, home_country')
      .in('id', everyone);
    profiles = Object.fromEntries((data || []).map((p) => [p.id, p]));
  }

  const fill = (id) => profiles[id] || { id, username: 'someone', avatar_emoji: '🙂' };

  return {
    friends: [...outgoing].filter((id) => incoming.has(id)).map(fill),
    // "You follow them, they have not followed back" — not yet a friend, so
    // they cannot see your map and you cannot see theirs.
    following: [...outgoing].filter((id) => !incoming.has(id)).map(fill),
    // "They follow you" — one tap from becoming mutual, which is the whole
    // growth loop, so this list is shown first.
    followers: [...incoming].filter((id) => !outgoing.has(id)).map(fill),
    profiles,
  };
}
