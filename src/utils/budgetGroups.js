// The breakdown has 37 categories, which is unreadable as a flat list or a pie.
// Grouping them answers the question people actually have — "which part of my
// life is eating the money" — and the detail stays one click away.
//
// Colours are the first six slots of the validated categorical palette, used in
// fixed order. Every segment carries a visible label, which is required because
// three of these sit below 3:1 contrast on white.

export const GROUPS = [
  {
    id: 'home',
    label: 'Home & bills',
    color: '#2a78d6',
    categories: ['Housing', 'Rent Insurance', 'Electricity', 'Water', 'Gas', 'Internet', 'Phone'],
  },
  {
    id: 'food',
    label: 'Food & drink',
    color: '#eb6834',
    categories: ['Groceries', 'Dining Out', 'Coffee & Snacks'],
  },
  {
    id: 'transport',
    label: 'Getting around',
    color: '#1baf7a',
    categories: ['Public Transport', 'Car Payment', 'Car Insurance', 'Fuel', 'Parking', 'Car Maintenance'],
  },
  {
    id: 'health',
    label: 'Health & family',
    color: '#eda100',
    categories: [
      'Health Insurance', 'Medications', 'Haircuts', 'Personal Care',
      'Childcare', "Children's Activities", 'Pet Food', 'Pet Vet',
    ],
  },
  {
    id: 'life',
    label: 'Life & fun',
    color: '#e87ba4',
    categories: [
      'Gym', 'Sports & Activities', 'Sports Equipment', 'Netflix', 'Spotify', 'iCloud+',
      'Other Subscriptions', 'Cinema & Entertainment', 'Clothing', 'Gifts', 'Miscellaneous',
    ],
  },
  {
    id: 'savings',
    label: 'Savings',
    color: '#008300',
    categories: ['Emergency Fund', 'Retirement Savings'],
  },
];

export function groupBudget(categories) {
  const assigned = new Set();

  const groups = GROUPS.map((group) => {
    const items = group.categories
      .filter((name) => {
        assigned.add(name);
        return (categories[name] || 0) > 0;
      })
      .map((name) => ({ name, amount: categories[name] }))
      .sort((a, b) => b.amount - a.amount);

    return {
      ...group,
      items,
      total: items.reduce((sum, i) => sum + i.amount, 0),
    };
  }).filter((g) => g.total > 0);

  // Anything added to the calculator later still shows up rather than silently
  // vanishing from the totals.
  const unassigned = Object.entries(categories)
    .filter(([name, amount]) => amount > 0 && !assigned.has(name))
    .map(([name, amount]) => ({ name, amount }));

  if (unassigned.length) {
    groups.push({
      id: 'other',
      label: 'Other',
      color: '#8b8b96',
      items: unassigned.sort((a, b) => b.amount - a.amount),
      total: unassigned.reduce((sum, i) => sum + i.amount, 0),
    });
  }

  return groups.sort((a, b) => b.total - a.total);
}
