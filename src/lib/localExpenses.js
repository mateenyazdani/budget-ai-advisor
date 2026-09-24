// The exact storage shape and key ExpenseLogger already writes to on
// /dashboard (see src/components/ExpenseLogger.js) — a shared helper so
// every "log this too" button across the app writes to the same place
// instead of each screen inventing its own.
export function logExpenseLocally({ amount, category, note }) {
  const existing = JSON.parse(localStorage.getItem('expenses') || '[]');
  const expense = {
    id: Date.now(),
    amount,
    category,
    note,
    timestamp: new Date().toLocaleString(),
    date: new Date().toLocaleDateString(),
  };
  localStorage.setItem('expenses', JSON.stringify([expense, ...existing]));
}
