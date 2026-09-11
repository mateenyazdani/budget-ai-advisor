// A realistic three months of transactions, so the comparison can be tried
// without exporting a real statement. Deliberately messy: varying grocery
// trips, two genuine subscriptions, one forgotten one, and a category the
// budget never planned for.
const MERCHANTS = [
  { desc: 'MERCADONA', category: 'Groceries', amounts: [43.2, 61.85, 28.4, 74.1, 39.95, 52.3] },
  { desc: 'CARREFOUR EXPRESS', category: 'Groceries', amounts: [18.6, 24.15, 31.2] },
  { desc: 'BAR TOMATE MADRID', category: 'Dining Out', amounts: [38.5, 46.0, 29.75] },
  { desc: 'TELEPIZZA', category: 'Dining Out', amounts: [21.4, 19.9, 24.6, 18.75] },
  { desc: 'GLOVO', category: 'Dining Out', amounts: [26.3, 33.15, 22.8, 29.4] },
  { desc: 'TOMA CAFE', category: 'Coffee & Snacks', amounts: [3.6, 4.2, 3.9, 4.5, 3.8] },
  { desc: 'METRO DE MADRID', category: 'Public Transport', amounts: [32.7] },
  { desc: 'ZARA SERRANO', category: 'Clothing', amounts: [59.95, 34.9] },
];

const SUBSCRIPTIONS = [
  { desc: 'NETFLIX.COM', category: 'Netflix', amount: 14.99, day: 3 },
  { desc: 'SPOTIFY P1B2C3', category: 'Spotify', amount: 11.99, day: 7 },
  { desc: 'BASIC FIT MADRID', category: 'Gym', amount: 29.99, day: 11 },
  // The point of the exercise: something still billing that is easy to forget.
  { desc: 'ADOBE CREATIVE CLOUD', category: 'Other Subscriptions', amount: 26.12, day: 19 },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

export function sampleStatementCsv(today = new Date()) {
  const rows = [
    'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance',
  ];

  for (let back = 2; back >= 0; back -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - back, 1);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);

    rows.push(`TOPUP,Current,${y}-${m}-25 09:00:00,${y}-${m}-25 09:00:00,Salary from Employer,2400.00,0.00,EUR,COMPLETED,0`);

    for (const s of SUBSCRIPTIONS) {
      rows.push(`CARD_PAYMENT,Current,${y}-${m}-${pad(s.day)} 09:00:00,${y}-${m}-${pad(s.day)} 09:00:00,${s.desc},-${s.amount},0.00,EUR,COMPLETED,0`);
    }

    let day = 2;
    for (const merchant of MERCHANTS) {
      for (const amount of merchant.amounts) {
        day = (day % 26) + 2;
        rows.push(`CARD_PAYMENT,Current,${y}-${m}-${pad(day)} 13:00:00,${y}-${m}-${pad(day)} 13:00:00,${merchant.desc},-${amount},0.00,EUR,COMPLETED,0`);
      }
    }
  }

  return rows.join('\n');
}
