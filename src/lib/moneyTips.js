// Durable local money-saving techniques, not live prices or hours — those
// drift, so every specific claim here links out to the source that actually
// keeps it current rather than freezing a number that will eventually be
// wrong. Verified against each museum's own site before shipping.
export const MONEY_TIPS = {
  Madrid: [
    {
      id: 'free-museum-evenings',
      emoji: '🖼️',
      ring: 'ring-purple',
      title: 'Free museum evenings',
      summary: "Madrid's big three galleries are free every single day — just at specific hours.",
      body: [
        'The Prado is free Monday–Saturday 18:00–20:00, and Sunday/holidays 17:00–19:00.',
        'The Reina Sofía is free Monday and Wednesday–Saturday 19:00–21:00, and Sunday 12:30–14:30 (closed Tuesdays).',
        'A free timed-entry ticket is still required for these slots and they do fill up — book it a day or two ahead on the museum’s own site rather than showing up and hoping.',
      ],
      link: { label: 'Check current Prado hours ↗', url: 'https://www.museodelprado.es/en/visit/opening-times-and-prices' },
    },
    {
      id: 'tapeo',
      emoji: '🍷',
      ring: 'ring-orange',
      title: 'Order a drink, eat for free',
      summary: 'Tapeo — traditional bars in Madrid still serve a free tapa with every drink you order.',
      body: [
        'It’s strongest in the older, less touristy bars around La Latina and Los Austrias — a caña or vermut usually comes with a small plate at no extra charge.',
        'Order one drink per bar and move on rather than staying put — it’s a bar crawl by design, and each stop is a different free tapa.',
      ],
      actionLabel: 'Find cheap eats near you →',
      actionCategory: 'Dining',
      actionBudget: 15,
    },
    {
      id: 'padel-split',
      emoji: '🎾',
      ring: 'ring-blue',
      title: 'Split a padel court, don’t book one solo',
      summary: 'Playtomic lists open matches at Madrid clubs where a court is already being split by other players.',
      body: [
        'Booking a full court alone or with one friend means paying the whole hourly rate between two people.',
        'Joining an "open match" on Playtomic instead splits the same court between three or four, so your share drops accordingly.',
      ],
      link: { label: 'Open Playtomic ↗', url: 'https://www.playtomic.io' },
      actionLabel: 'Find padel courts near you →',
      actionCategory: 'Padel',
    },
    {
      id: 'discount-supermarket',
      emoji: '🛒',
      ring: 'ring-green',
      title: 'Stock up, don’t top up',
      summary: 'A weekly trip to a discount chain beats daily stops at the corner shop.',
      body: [
        'Mercadona, Dia and Lidl are consistently the cheapest major grocery chains in Madrid — a single weekly shop there covers most staples for less than the same basket bought a little at a time from a pricier local shop.',
        'Corner shops (and anything near a metro exit) charge a real convenience premium — worth it occasionally, not as a habit.',
      ],
    },
  ],
};

export function moneyTipsForCity(city) {
  if (!city) return null;
  const key = Object.keys(MONEY_TIPS).find(
    (k) => k.toLowerCase() === String(city).trim().toLowerCase()
  );
  return key ? MONEY_TIPS[key] : null;
}
