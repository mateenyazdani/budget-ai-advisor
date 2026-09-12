// Two kinds of category, because they behave differently.
//
// A "place" category has somewhere you physically go, so it shows nearby venues
// with offers attached. An "offer" category — a SIM card, broadband, insurance —
// has no venue at all, so showing a map of shops would be noise; it goes
// straight to the deals.

export const CATEGORIES = [
  // Food and drink
  { id: 'Dining', label: 'Eat out', icon: '🍽️', group: 'Food', type: 'place' },
  { id: 'Coffee', label: 'Coffee', icon: '☕', group: 'Food', type: 'place' },
  { id: 'Groceries', label: 'Groceries', icon: '🛒', group: 'Food', type: 'place' },
  { id: 'Takeaway', label: 'Takeaway', icon: '🥡', group: 'Food', type: 'place' },
  { id: 'Nightlife', label: 'Bars', icon: '🍸', group: 'Food', type: 'place' },

  // Sport and fitness
  { id: 'Padel', label: 'Padel', icon: '🎾', group: 'Sport', type: 'place' },
  { id: 'Tennis', label: 'Tennis', icon: '🥎', group: 'Sport', type: 'place' },
  { id: 'Gym', label: 'Gym', icon: '💪', group: 'Sport', type: 'place' },
  { id: 'Swimming', label: 'Swimming', icon: '🏊', group: 'Sport', type: 'place' },
  { id: 'Football', label: 'Football', icon: '⚽', group: 'Sport', type: 'place' },
  { id: 'Climbing', label: 'Climbing', icon: '🧗', group: 'Sport', type: 'place' },
  { id: 'Yoga', label: 'Yoga', icon: '🧘', group: 'Sport', type: 'place' },
  { id: 'Golf', label: 'Golf', icon: '⛳', group: 'Sport', type: 'place' },

  // Going out
  { id: 'Cinema', label: 'Cinema', icon: '🎬', group: 'Going out', type: 'place' },
  { id: 'Museums', label: 'Museums', icon: '🏛️', group: 'Going out', type: 'place' },
  { id: 'Bowling', label: 'Bowling', icon: '🎳', group: 'Going out', type: 'place' },
  { id: 'Concerts', label: 'Concerts', icon: '🎤', group: 'Going out', type: 'offer' },

  // Looking after yourself
  { id: 'Beauty', label: 'Hair & beauty', icon: '💈', group: 'Personal', type: 'place' },
  { id: 'Spa', label: 'Spa & massage', icon: '💆', group: 'Personal', type: 'place' },
  { id: 'Dentist', label: 'Dentist', icon: '🦷', group: 'Personal', type: 'place' },
  { id: 'Optician', label: 'Glasses', icon: '👓', group: 'Personal', type: 'place' },
  { id: 'Pharmacy', label: 'Pharmacy', icon: '💊', group: 'Personal', type: 'place' },

  // Shopping
  { id: 'Shopping', label: 'Clothes', icon: '👕', group: 'Shopping', type: 'place' },
  { id: 'Electronics', label: 'Electronics', icon: '📱', group: 'Shopping', type: 'place' },
  { id: 'Furniture', label: 'Home & furniture', icon: '🛋️', group: 'Shopping', type: 'place' },
  { id: 'Books', label: 'Books', icon: '📚', group: 'Shopping', type: 'place' },
  { id: 'Pets', label: 'Pets', icon: '🐾', group: 'Shopping', type: 'place' },

  // Travel
  { id: 'Hotels', label: 'Hotels', icon: '🏨', group: 'Travel', type: 'place' },
  { id: 'Flights', label: 'Flights', icon: '✈️', group: 'Travel', type: 'offer' },
  { id: 'CarHire', label: 'Car hire', icon: '🚗', group: 'Travel', type: 'offer' },
  { id: 'Trains', label: 'Trains & coaches', icon: '🚆', group: 'Travel', type: 'offer' },

  // Bills and services — no venue, so offers only
  { id: 'SimCard', label: 'SIM & mobile', icon: '📶', group: 'Bills', type: 'offer' },
  { id: 'Broadband', label: 'Broadband', icon: '🌐', group: 'Bills', type: 'offer' },
  { id: 'Energy', label: 'Energy', icon: '💡', group: 'Bills', type: 'offer' },
  { id: 'Insurance', label: 'Insurance', icon: '🛡️', group: 'Bills', type: 'offer' },
  { id: 'Streaming', label: 'Streaming', icon: '📺', group: 'Bills', type: 'offer' },
  { id: 'Banking', label: 'Banking', icon: '🏦', group: 'Bills', type: 'offer' },
];

export const GROUPS = ['Food', 'Sport', 'Going out', 'Personal', 'Shopping', 'Travel', 'Bills'];

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}
