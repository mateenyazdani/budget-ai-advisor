// Two kinds of category, because they behave differently.
//
// A "place" category has somewhere you physically go, so it shows nearby venues
// with offers attached. An "offer" category — a SIM card, broadband, insurance —
// has no venue at all, so showing a map of shops would be noise; it goes
// straight to the deals.
//
// Each one also sits under one of six things a person might be after. Thirty-
// seven choices is a wall; six is a question you can answer in a second, and the
// thirty-seven are one tap behind it.

export const TOP_LEVEL = [
  { id: 'EAT', label: 'Eat', icon: '🍔', blurb: 'Restaurants, cafés, food shops' },
  { id: 'PLAY', label: 'Play', icon: '🎾', blurb: 'Sport, cinema, going out' },
  { id: 'SHOP', label: 'Shop', icon: '👕', blurb: 'Clothes, beauty, health' },
  { id: 'TRAVEL', label: 'Travel', icon: '✈️', blurb: 'Hotels, flights, car hire' },
  { id: 'HOME', label: 'Home', icon: '🏠', blurb: 'Furniture, energy, money' },
  { id: 'TECH', label: 'Tech', icon: '💻', blurb: 'Phones, broadband, streaming' },
];

export const CATEGORIES = [
  // Eat
  { id: 'Dining', label: 'Eat out', icon: '🍽️', top: 'EAT', type: 'place' },
  { id: 'Coffee', label: 'Coffee', icon: '☕', top: 'EAT', type: 'place' },
  { id: 'Takeaway', label: 'Takeaway', icon: '🥡', top: 'EAT', type: 'place' },
  { id: 'Groceries', label: 'Groceries', icon: '🛒', top: 'EAT', type: 'place' },
  { id: 'Nightlife', label: 'Bars', icon: '🍸', top: 'EAT', type: 'place' },

  // Play
  { id: 'Padel', label: 'Padel', icon: '🎾', top: 'PLAY', type: 'place' },
  { id: 'Tennis', label: 'Tennis', icon: '🥎', top: 'PLAY', type: 'place' },
  { id: 'Gym', label: 'Gym', icon: '💪', top: 'PLAY', type: 'place' },
  { id: 'Swimming', label: 'Swimming', icon: '🏊', top: 'PLAY', type: 'place' },
  { id: 'Football', label: 'Football', icon: '⚽', top: 'PLAY', type: 'place' },
  { id: 'Climbing', label: 'Climbing', icon: '🧗', top: 'PLAY', type: 'place' },
  { id: 'Yoga', label: 'Yoga', icon: '🧘', top: 'PLAY', type: 'place' },
  { id: 'Golf', label: 'Golf', icon: '⛳', top: 'PLAY', type: 'place' },
  { id: 'Cinema', label: 'Cinema', icon: '🎬', top: 'PLAY', type: 'place' },
  { id: 'Museums', label: 'Museums', icon: '🏛️', top: 'PLAY', type: 'place' },
  { id: 'Bowling', label: 'Bowling', icon: '🎳', top: 'PLAY', type: 'place' },
  { id: 'Concerts', label: 'Concerts', icon: '🎤', top: 'PLAY', type: 'offer' },

  // Shop
  { id: 'Shopping', label: 'Clothes', icon: '👕', top: 'SHOP', type: 'place' },
  { id: 'Books', label: 'Books', icon: '📚', top: 'SHOP', type: 'place' },
  { id: 'Pets', label: 'Pets', icon: '🐾', top: 'SHOP', type: 'place' },
  { id: 'Beauty', label: 'Hair & beauty', icon: '💈', top: 'SHOP', type: 'place' },
  { id: 'Spa', label: 'Spa & massage', icon: '💆', top: 'SHOP', type: 'place' },
  { id: 'Optician', label: 'Glasses', icon: '👓', top: 'SHOP', type: 'place' },
  { id: 'Pharmacy', label: 'Pharmacy', icon: '💊', top: 'SHOP', type: 'place' },
  { id: 'Dentist', label: 'Dentist', icon: '🦷', top: 'SHOP', type: 'place' },

  // Travel
  { id: 'Hotels', label: 'Hotels', icon: '🏨', top: 'TRAVEL', type: 'place' },
  { id: 'Flights', label: 'Flights', icon: '✈️', top: 'TRAVEL', type: 'offer' },
  { id: 'CarHire', label: 'Car hire', icon: '🚗', top: 'TRAVEL', type: 'offer' },
  { id: 'Trains', label: 'Trains & coaches', icon: '🚆', top: 'TRAVEL', type: 'offer' },

  // Home
  { id: 'Furniture', label: 'Furniture', icon: '🛋️', top: 'HOME', type: 'place' },
  { id: 'Energy', label: 'Energy', icon: '💡', top: 'HOME', type: 'offer' },
  { id: 'Insurance', label: 'Insurance', icon: '🛡️', top: 'HOME', type: 'offer' },
  { id: 'Banking', label: 'Banking', icon: '🏦', top: 'HOME', type: 'offer' },

  // Tech
  { id: 'Electronics', label: 'Electronics', icon: '📱', top: 'TECH', type: 'place' },
  { id: 'SimCard', label: 'SIM & mobile', icon: '📶', top: 'TECH', type: 'offer' },
  { id: 'Broadband', label: 'Broadband', icon: '🌐', top: 'TECH', type: 'offer' },
  { id: 'Streaming', label: 'Streaming', icon: '📺', top: 'TECH', type: 'offer' },
];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

export function categoriesIn(topId) {
  return CATEGORIES.filter((c) => c.top === topId);
}
