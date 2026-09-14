import { supabase } from './supabase';

// A pin is one person's verdict on one place: what they paid, out of five, and
// a sentence about why. Row level security decides who may read it — this file
// never filters by friendship, because a filter you can forget is not a rule.

export async function savePin(pin) {
  if (!supabase) return { error: 'Not connected.' };
  const { data: auth } = await supabase.auth.getUser();
  const me = auth?.user?.id;
  if (!me) return { error: 'Sign in to pin a place.' };

  if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) {
    return { error: 'That place has no location, so it cannot go on the map.' };
  }
  if (!pin.countryCode) {
    return { error: 'That place has no country, so it cannot go on the map.' };
  }

  const row = {
    user_id: me,
    place_id: pin.placeId || null,
    name: pin.name,
    category: pin.category || null,
    country_code: pin.countryCode,
    country_name: pin.countryName || null,
    city: pin.city || null,
    lat: pin.lat,
    lng: pin.lng,
    rating: pin.rating,
    price_paid: pin.pricePaid ?? null,
    currency: pin.currency || '€',
    note: pin.note || null,
  };

  // Rating the same place again is a correction, not a second opinion, so the
  // unique (user_id, place_id) row is replaced rather than duplicated.
  const { data, error } = await supabase
    .from('pins')
    .upsert(row, { onConflict: 'user_id,place_id' })
    .select()
    .maybeSingle();

  return error ? { error: error.message } : { ok: true, pin: data };
}

export async function deletePin(id) {
  const { error } = await supabase.from('pins').delete().eq('id', id);
  return error ? { error: error.message } : { ok: true };
}

// Everything the signed-in person is allowed to see: their own pins and their
// friends'. The author's profile rides along so the map can say who left it.
export async function loadVisiblePins() {
  if (!supabase) return [];

  const { data: pins } = await supabase
    .from('pins')
    .select('*')
    .order('created_at', { ascending: false });

  if (!pins?.length) return [];

  const authorIds = [...new Set(pins.map((p) => p.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_emoji')
    .in('id', authorIds);

  const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
  return pins.map((p) => ({ ...p, author: byId[p.user_id] || null }));
}

// The world view needs one bubble per country, not five hundred markers. Each
// bubble sits at the mean of its own pins, so it lands on the part of the
// country people actually went to rather than a generic centroid.
export function groupByCountry(pins) {
  const buckets = new Map();

  for (const pin of pins) {
    const key = pin.country_code;
    if (!key) continue;
    if (!buckets.has(key)) {
      buckets.set(key, {
        code: key,
        name: pin.country_name || key,
        pins: [],
        latSum: 0,
        lngSum: 0,
      });
    }
    const bucket = buckets.get(key);
    bucket.pins.push(pin);
    bucket.latSum += pin.lat;
    bucket.lngSum += pin.lng;
  }

  return [...buckets.values()]
    .map((b) => ({
      code: b.code,
      name: b.name,
      count: b.pins.length,
      friends: new Set(b.pins.map((p) => p.user_id)).size,
      lat: b.latSum / b.pins.length,
      lng: b.lngSum / b.pins.length,
      pins: b.pins,
    }))
    .sort((a, b) => b.count - a.count);
}

export function averageRating(pins) {
  if (!pins.length) return null;
  return Number((pins.reduce((sum, p) => sum + p.rating, 0) / pins.length).toFixed(1));
}
