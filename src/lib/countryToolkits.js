// A directory of real, well-known local services for someone newly in a
// city — never prices, only names and real links. Prices belong to the live
// deals search (api/deals.js), which can actually verify a current figure;
// a hardcoded number here would only ever go stale and be wrong.
export const COUNTRY_TOOLKITS = {
  Madrid: {
    city: 'Madrid',
    country: 'Spain',
    flag: '🇪🇸',
    groups: [
      {
        label: 'SIM & mobile',
        items: [
          { name: 'Digi', url: 'https://www.digimobil.es', note: 'No-contract SIM plans, often the cheapest data-only option' },
          { name: 'Pepephone', url: 'https://www.pepephone.com', note: 'No-contract, simple pricing, well-rated support' },
          { name: 'Lowi', url: 'https://www.lowi.es', note: 'Vodafone network coverage at a budget price' },
        ],
      },
      {
        label: 'Eating out',
        items: [
          { name: 'TheFork', url: 'https://www.thefork.es', note: 'Restaurant reservations and menu discounts across Madrid' },
          { name: 'Too Good To Go', url: 'https://www.toogoodtogo.com', note: 'Unsold food from real bakeries and restaurants, a fraction of the price' },
        ],
      },
      {
        label: 'Getting around',
        items: [
          { name: 'EMT Madrid', url: 'https://www.emtmadrid.es', note: 'City bus passes — usually cheaper than paying per ride past a handful of trips' },
        ],
      },
    ],
  },
};

// Matched loosely against whatever the user typed into the city box, so
// "madrid", "Madrid, Spain" and "MADRID" all resolve to the same toolkit.
export function toolkitForCity(city) {
  if (!city) return null;
  const key = Object.keys(COUNTRY_TOOLKITS).find(
    (k) => k.toLowerCase() === String(city).trim().toLowerCase()
  );
  return key ? COUNTRY_TOOLKITS[key] : null;
}
