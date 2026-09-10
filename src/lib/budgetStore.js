import { supabase } from './supabase';

// Maps between the shape the app uses and the columns in the database.
function toRow(budget, userId, answers) {
  return {
    user_id: userId,
    country: budget.country,
    currency: budget.currency,
    monthly_income: budget.monthlyIncome,
    age: budget.age ?? null,
    categories: budget.categories,
    total_expenses: budget.totalExpenses,
    surplus: budget.surplus,
    savings_rate: budget.savingsRate ? parseFloat(budget.savingsRate) : null,
    answers: answers || {},
    updated_at: new Date().toISOString(),
  };
}

function fromRow(row) {
  if (!row) return null;
  return {
    country: row.country,
    currency: row.currency,
    monthlyIncome: Number(row.monthly_income),
    age: row.age,
    categories: row.categories || {},
    totalExpenses: Number(row.total_expenses),
    surplus: Number(row.surplus),
    savingsRate: row.savings_rate != null ? String(row.savings_rate) : null,
    currentSavings: row.answers?.currentSavings ? parseFloat(row.answers.currentSavings) : null,
    // Kept so the setup form can be reopened with what was entered last time.
    answers: row.answers || {},
    // Recommendations are derived, not stored, so they stay in step with the
    // rules rather than being frozen at whatever they were when saved.
    recommendations: [],
  };
}

export async function saveBudget(budget, answers) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('budgets')
    .insert(toRow(budget, user.id, answers))
    .select()
    .single();

  if (error) {
    console.error('Could not save budget:', error.message);
    return null;
  }
  return data.id;
}

export async function loadLatestBudget() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Could not load budget:', error.message);
    return null;
  }
  return fromRow(data);
}

export async function addExpense({ amount, category, note, spentAt }) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { error } = await supabase.from('expenses').insert({
    user_id: user.id,
    amount,
    category,
    note: note || null,
    spent_at: spentAt || new Date().toISOString().slice(0, 10),
  });

  if (error) console.error('Could not save expense:', error.message);
  return !error;
}

// Statements overlap when you export month to month, so rows carry a stable
// external_id and duplicates are ignored rather than piling up.
export async function importTransactions(transactions) {
  if (!supabase) return { saved: 0, skipped: 0 };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: 0, skipped: 0, error: 'Not signed in.' };

  const rows = transactions
    .filter((t) => t.amount < 0)
    .map((t) => ({
      user_id: user.id,
      amount: Math.abs(t.amount),
      category: t.category,
      note: t.description,
      spent_at: t.date,
      external_id: t.externalId,
    }));

  if (!rows.length) return { saved: 0, skipped: 0 };

  const { data, error } = await supabase
    .from('expenses')
    .upsert(rows, { onConflict: 'user_id,external_id', ignoreDuplicates: true })
    .select();

  if (error) {
    console.error('Could not import transactions:', error.message);
    return { saved: 0, skipped: 0, error: error.message };
  }

  const saved = data?.length || 0;
  return { saved, skipped: rows.length - saved };
}

export async function loadExpenses(sinceDate) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('spent_at', sinceDate || new Date().toISOString().slice(0, 8) + '01')
    .order('spent_at', { ascending: false });

  if (error) {
    console.error('Could not load expenses:', error.message);
    return [];
  }
  return data.map((e) => ({
    id: e.id,
    amount: Number(e.amount),
    category: e.category,
    note: e.note,
    spentAt: e.spent_at,
  }));
}
