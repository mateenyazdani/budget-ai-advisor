// Turns imported transactions into the three things a statement can tell you
// that a budget cannot: what you are quietly paying every month, which
// categories ran hot, and what next month should look like.

const RULES_KEY = 'categoryRules';

// Strips the parts of a description that change between charges — dates,
// reference numbers, card suffixes — so the same merchant groups together.
export function merchantKey(description) {
  return String(description)
    .toLowerCase()
    .replace(/\d{2}[/.-]\d{2}([/.-]\d{2,4})?/g, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/[*#]+/g, ' ')
    .replace(/\b(payment|purchase|card|compra|pago|tarjeta)\b/g, ' ')
    .replace(/[^a-z0-9áéíóúñü ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
}

function daysBetween(a, b) {
  return Math.abs((new Date(b) - new Date(a)) / 86400000);
}

// Spending that is variable by nature. A shop charging a similar amount two
// months running is not a subscription, and listing the weekly supermarket as
// one buries the charges that actually are.
const NEVER_RECURRING = new Set([
  'Groceries', 'Dining Out', 'Coffee & Snacks', 'Clothing', 'Miscellaneous',
]);

// A charge is recurring when the same merchant appears in separate months for
// a similar amount. One appearance proves nothing.
export function findRecurring(transactions) {
  const groups = new Map();

  for (const t of transactions) {
    if (t.amount >= 0) continue;
    if (NEVER_RECURRING.has(t.category)) continue;
    const key = merchantKey(t.description);
    if (key.length < 3) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const recurring = [];

  for (const [key, items] of groups) {
    if (items.length < 2) continue;

    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    const months = new Set(sorted.map((t) => t.date.slice(0, 7)));
    if (months.size < 2) continue;

    const amounts = sorted.map((t) => Math.abs(t.amount));
    const typical = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const consistent = amounts.every((a) => Math.abs(a - typical) <= Math.max(typical * 0.05, 0.5));
    if (!consistent) continue;

    const gaps = sorted.slice(1).map((t, i) => daysBetween(sorted[i].date, t.date));
    const monthly = gaps.every((g) => g >= 20 && g <= 40);
    if (!monthly) continue;

    recurring.push({
      key,
      name: sorted[sorted.length - 1].description,
      amount: Number(typical.toFixed(2)),
      seen: sorted.length,
      category: sorted[sorted.length - 1].category,
      lastDate: sorted[sorted.length - 1].date,
      yearly: Number((typical * 12).toFixed(2)),
    });
  }

  return recurring.sort((a, b) => b.amount - a.amount);
}

// Compares one month of real spending against the plan.
export function comparePlan(byCategory, budgetCategories, monthsCovered = 1) {
  const rows = byCategory.map(({ category, total }) => {
    const actual = total / monthsCovered;
    const planned = budgetCategories?.[category];
    const known = typeof planned === 'number';
    return {
      category,
      actual: Number(actual.toFixed(2)),
      planned: known ? planned : null,
      difference: known ? Number((actual - planned).toFixed(2)) : null,
      // A category is "hot" when it is meaningfully over, not a euro over.
      hot: known && actual > planned * 1.25 && actual - planned > 20,
      unplanned: !known,
    };
  });

  return rows.sort((a, b) => (b.difference ?? -Infinity) - (a.difference ?? -Infinity));
}

// The single change that would close the most of the gap next month.
export function suggestAdjustment(rows, surplus) {
  const worst = rows.find((r) => r.hot);
  if (!worst) return null;

  const target = Math.round(worst.planned * 1.05);
  return {
    category: worst.category,
    actual: worst.actual,
    planned: worst.planned,
    target,
    saving: Math.round(worst.actual - target),
    closesDeficit: surplus < 0 && worst.actual - target >= Math.abs(surplus),
  };
}

// Corrections are remembered per merchant so the same charge is not
// re-miscategorised on the next import. Kept in the browser: it is a personal
// preference, not shared data.
export function loadRules() {
  try {
    return JSON.parse(localStorage.getItem(RULES_KEY)) || {};
  } catch {
    return {};
  }
}

export function saveRule(description, category) {
  const rules = loadRules();
  rules[merchantKey(description)] = category;
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    // A full or blocked store just means the correction is not remembered.
  }
  return rules;
}

export function applyRules(transactions, rules = loadRules()) {
  return transactions.map((t) => {
    const rule = rules[merchantKey(t.description)];
    return rule ? { ...t, category: rule, corrected: true } : t;
  });
}
