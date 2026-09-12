// Google knows a padel court exists and how far away it is; the web search
// knows someone is offering it at EUR 6/hour. Neither knows about the other, so
// they are matched here by name.

function normalise(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(el|la|los|las|the|de|del|club|centro|center|centre|sl|sa)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(name) {
  return new Set(normalise(name).split(' ').filter((t) => t.length > 2));
}

// Two names match when one's distinctive words are contained in the other's.
// Deliberately strict: attaching the wrong offer to a venue is worse than
// showing the offer separately.
function namesMatch(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return false;

  const smaller = ta.size <= tb.size ? ta : tb;
  const larger = ta.size <= tb.size ? tb : ta;

  let shared = 0;
  for (const t of smaller) if (larger.has(t)) shared += 1;

  // A single shared word is only enough when that is all the shorter name has
  // and it is distinctive.
  if (smaller.size === 1) return shared === 1 && [...smaller][0].length >= 5;
  return shared >= 2 || shared / smaller.size >= 0.75;
}

export function attachOffers(places, deals) {
  const used = new Set();

  const withOffers = places.map((place) => {
    const match = deals.find((deal, i) => !used.has(i) && namesMatch(place.name, deal.merchant));
    if (match) used.add(deals.indexOf(match));
    return match ? { ...place, offer: match } : place;
  });

  // Offers that could not be tied to a nearby venue are still real and still
  // worth showing — they just cannot claim a distance.
  const unmatched = deals.filter((_, i) => !used.has(i));

  // A venue with a deal is the whole point, so it goes first.
  withOffers.sort((a, b) => {
    if (Boolean(b.offer) !== Boolean(a.offer)) return b.offer ? 1 : -1;
    return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
  });

  return { places: withOffers, unmatched };
}
