// Turns a budget into the two or three things someone actually wants to know:
// what they can spend, what they will have saved, and the one change worth
// making. A breakdown answers "where did it go"; this answers "what now".

// Categories a person can realistically change this month. Rent and insurance
// are not on the list, because "spend less on rent" is not an action.
const DISCRETIONARY = [
  { name: 'Dining Out', ceiling: 0.08 },
  { name: 'Coffee & Snacks', ceiling: 0.025 },
  { name: 'Cinema & Entertainment', ceiling: 0.05 },
  { name: 'Clothing', ceiling: 0.04 },
  { name: 'Sports & Activities', ceiling: 0.05 },
  { name: 'Other Subscriptions', ceiling: 0.015 },
  { name: 'Miscellaneous', ceiling: 0.035 },
];

export function daysLeftInMonth(today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Math.max(end - today.getDate() + 1, 1);
}

export function getInsights(budget, today = new Date()) {
  const { monthlyIncome, totalExpenses, surplus, categories = {} } = budget;
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) return null;

  const daysLeft = daysLeftInMonth(today);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // What is left after the committed costs, spread across the days remaining.
  const discretionaryTotal = DISCRETIONARY.reduce((sum, d) => sum + (categories[d.name] || 0), 0);
  const spendableThisMonth = Math.max(discretionaryTotal + Math.max(surplus, 0), 0);
  const perDay = spendableThisMonth / daysInMonth;
  const safeThisWeek = Math.round(perDay * Math.min(7, daysLeft));

  const projectedSaving =
    (categories['Emergency Fund'] || 0) + (categories['Retirement Savings'] || 0) + Math.max(surplus, 0);

  // The single category furthest above what someone on this income would
  // usually spend — the one change with the most behind it.
  let action = null;
  let worstGap = 0;
  for (const { name, ceiling } of DISCRETIONARY) {
    const amount = categories[name] || 0;
    const target = monthlyIncome * ceiling;
    const gap = amount - target;
    if (gap > worstGap && gap > 15) {
      worstGap = gap;
      action = {
        category: name,
        amount,
        target: Math.round(target),
        reduceBy: Math.round(gap),
      };
    }
  }

  // With no overspend to flag, the useful nudge depends on whether the month
  // actually balances.
  let status = 'on-track';
  if (surplus < 0) status = 'risk';
  else if (surplus < monthlyIncome * 0.05) status = 'attention';

  return {
    safeThisWeek,
    daysLeft,
    projectedSaving: Math.round(projectedSaving),
    savingRate: totalExpenses > 0 ? Math.round((projectedSaving / monthlyIncome) * 100) : 0,
    action,
    status,
  };
}
