import { supabase } from './supabase';

// A want-to-try is a bookmark, not a verdict — it needs none of a pin's
// social visibility, so it stays out of pins entirely and is never shown to
// anyone but the person who saved it.

export async function saveWantToTry(place) {
  if (!supabase) return { error: 'Not connected.' };
  const { data: auth } = await supabase.auth.getUser();
  const me = auth?.user?.id;
  if (!me) return { error: 'Sign in to save a place.' };
  if (!place?.id) return { error: 'This place has no id to save.' };

  const { error } = await supabase.from('saved_places').upsert(
    {
      user_id: me,
      place_id: place.id,
      name: place.name,
      details: {
        category: place.category || null,
        address: place.address || null,
        lat: place.lat ?? null,
        lng: place.lng ?? null,
        countryCode: place.countryCode || null,
      },
    },
    { onConflict: 'user_id,place_id' }
  );
  return error ? { error: error.message } : { ok: true };
}

export async function removeWantToTry(placeId) {
  if (!supabase) return { error: 'Not connected.' };
  const { data: auth } = await supabase.auth.getUser();
  const me = auth?.user?.id;
  if (!me) return { error: 'Sign in first.' };
  const { error } = await supabase.from('saved_places').delete().eq('user_id', me).eq('place_id', placeId);
  return error ? { error: error.message } : { ok: true };
}

export async function loadWantToTry() {
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  const me = auth?.user?.id;
  if (!me) return [];
  const { data } = await supabase
    .from('saved_places')
    .select('*')
    .eq('user_id', me)
    .order('created_at', { ascending: false });
  return data || [];
}
