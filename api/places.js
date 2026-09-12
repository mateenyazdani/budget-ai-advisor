const NEARBY_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
const TEXT_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.currentOpeningHours.openNow',
  'places.googleMapsUri',
].join(',');

// Google returns a price *band*, never an actual price. These are rough
// per-visit spends for each band so the UI can filter against a daily budget;
// they are labelled as estimates in the UI and must not be shown as real prices.
const CATEGORIES = {
  Dining: {
    emoji: '🍽️',
    types: ['restaurant'],
    spend: { INEXPENSIVE: 12, MODERATE: 25, EXPENSIVE: 45, VERY_EXPENSIVE: 80 },
  },
  Groceries: {
    emoji: '🛒',
    types: ['supermarket', 'grocery_store'],
    spend: { INEXPENSIVE: 20, MODERATE: 35, EXPENSIVE: 55, VERY_EXPENSIVE: 80 },
  },
  Coffee: {
    emoji: '☕',
    types: ['cafe', 'coffee_shop'],
    spend: { INEXPENSIVE: 3, MODERATE: 5, EXPENSIVE: 8, VERY_EXPENSIVE: 12 },
  },
  Padel: {
    emoji: '🎾',
    textQuery: 'padel court',
    spend: { INEXPENSIVE: 20, MODERATE: 28, EXPENSIVE: 35, VERY_EXPENSIVE: 50 },
  },
  Tennis: {
    emoji: '🎾',
    textQuery: 'tennis club court',
    spend: { INEXPENSIVE: 18, MODERATE: 28, EXPENSIVE: 40, VERY_EXPENSIVE: 60 },
  },
  Cinema: {
    emoji: '🎬',
    types: ['movie_theater'],
    spend: { INEXPENSIVE: 7, MODERATE: 11, EXPENSIVE: 15, VERY_EXPENSIVE: 22 },
  },
  Travel: {
    emoji: '✈️',
    types: ['travel_agency', 'lodging'],
    spend: { INEXPENSIVE: 45, MODERATE: 85, EXPENSIVE: 150, VERY_EXPENSIVE: 260 },
  },
  Nightlife: {
    emoji: '🍸',
    types: ['bar', 'night_club'],
    spend: { INEXPENSIVE: 12, MODERATE: 22, EXPENSIVE: 38, VERY_EXPENSIVE: 60 },
  },
  Beauty: {
    emoji: '💈',
    types: ['hair_care', 'beauty_salon'],
    spend: { INEXPENSIVE: 15, MODERATE: 28, EXPENSIVE: 45, VERY_EXPENSIVE: 80 },
  },
  Gym: {
    emoji: '💪',
    types: ['gym', 'fitness_center'],
    spend: { INEXPENSIVE: 10, MODERATE: 15, EXPENSIVE: 20, VERY_EXPENSIVE: 30 },
  },
  Shopping: {
    emoji: '👕',
    types: ['clothing_store', 'shopping_mall', 'department_store'],
    spend: { INEXPENSIVE: 20, MODERATE: 40, EXPENSIVE: 70, VERY_EXPENSIVE: 120 },
  },
};

const ALL_CATEGORY = {
  emoji: '📍',
  types: ['restaurant', 'cafe', 'supermarket', 'gym', 'clothing_store'],
  spend: { INEXPENSIVE: 12, MODERATE: 25, EXPENSIVE: 45, VERY_EXPENSIVE: 80 },
};

const PRICE_LABELS = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '€',
  PRICE_LEVEL_MODERATE: '€€',
  PRICE_LEVEL_EXPENSIVE: '€€€',
  PRICE_LEVEL_VERY_EXPENSIVE: '€€€€',
};

function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function estimateSpend(priceLevel, spendTable) {
  if (priceLevel === 'PRICE_LEVEL_FREE') return 0;
  const band = String(priceLevel || '').replace('PRICE_LEVEL_', '');
  return spendTable[band] ?? null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    // Not an error - the app falls back to sample data and tells the user why.
    return res.status(200).json({
      configured: false,
      places: [],
      message: 'GOOGLE_PLACES_API_KEY is not set, so live places are unavailable.',
    });
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
  }

  const requested = String(req.query.category || 'All');
  const category = requested === 'All' ? ALL_CATEGORY : CATEGORIES[requested];
  if (!category) {
    return res.status(400).json({ error: 'Unknown category.' });
  }

  const radius = Math.min(Math.max(Number(req.query.radius) || 3000, 500), 20000);

  const useTextSearch = Boolean(category.textQuery);
  const body = useTextSearch
    ? {
        textQuery: category.textQuery,
        maxResultCount: 20,
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      }
    : {
        includedTypes: category.types,
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      };

  try {
    const response = await fetch(useTextSearch ? TEXT_ENDPOINT : NEARBY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Places API error', response.status, detail.slice(0, 500));
      return res.status(502).json({ error: 'Could not reach the places service.' });
    }

    const data = await response.json();
    const places = (data.places || []).map((place) => {
      const priceLevel = place.priceLevel || null;
      return {
        id: place.id,
        name: place.displayName?.text || 'Unnamed place',
        address: place.formattedAddress || null,
        rating: typeof place.rating === 'number' ? place.rating : null,
        ratingCount: place.userRatingCount ?? null,
        priceLabel: PRICE_LABELS[priceLevel] || null,
        estimatedSpend: estimateSpend(priceLevel, category.spend),
        openNow: place.currentOpeningHours?.openNow ?? null,
        distanceKm: place.location
          ? Number(distanceKm(lat, lng, place.location.latitude, place.location.longitude).toFixed(1))
          : null,
        mapsUri: place.googleMapsUri || null,
        emoji: category.emoji,
      };
    });

    places.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    return res.status(200).json({ configured: true, places });
  } catch (error) {
    console.error('Places request failed:', error);
    return res.status(502).json({ error: 'Could not reach the places service.' });
  }
};
