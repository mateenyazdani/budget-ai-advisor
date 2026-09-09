import React, { useState } from 'react';
import '../styles/ExpenseLogger.css';

function ExpenseLogger({ budget, onExpenseAdd }) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [note, setNote] = useState('');
  const [expenses, setExpenses] = useState(JSON.parse(localStorage.getItem('expenses') || '[]'));

  const categories = ['Groceries', 'Dining Out', 'Transport', 'Entertainment', 'Coffee & Snacks', 'Gym', 'Padel', 'Other'];

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!amount) return;

    const expense = {
      id: Date.now(),
      amount: parseFloat(amount),
      category,
      note,
      timestamp: new Date().toLocaleString(),
      date: new Date().toLocaleDateString()
    };

    const updatedExpenses = [expense, ...expenses];
    setExpenses(updatedExpenses);
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));

    const totalSpent = updatedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const newSurplus = budget.monthlyIncome - (budget.totalExpenses + totalSpent);

    onExpenseAdd({ expenses: updatedExpenses, newSurplus });

    setAmount('');
    setCategory('Other');
    setNote('');
    setShowModal(false);
  };

  const totalSpentToday = expenses.filter(e => e.date === new Date().toLocaleDateString()).reduce((sum, e) => sum + e.amount, 0);
  const totalSpentOverall = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="expense-logger">
      <div className="spending-card">
        <div className="spending-stat">
          <span className="spending-label">Today</span>
          <span className="spending-amount">{budget.currency}{totalSpentToday.toFixed(2)}</span>
        </div>
        <div className="spending-stat">
          <span className="spending-label">Total Added</span>
          <span className="spending-amount">{budget.currency}{totalSpentOverall.toFixed(2)}</span>
        </div>
        <button className="btn-add-expense" onClick={() => setShowModal(true)}>+ Add Expense</button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Expense</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label>Amount ({budget.currency})</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label>Note (optional)</label>
                <input type="text" placeholder="e.g., Coffee at cafe" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <button type="submit" className="btn-submit">✓ Add</button>
            </form>
          </div>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="expense-history">
          <h4>Recent Expenses</h4>
          <div className="expense-list">
            {expenses.slice(0, 10).map(expense => (
              <div key={expense.id} className="expense-item">
                <div className="expense-info">
                  <span className="expense-category">{expense.category}</span>
                  {expense.note && <span className="expense-note">{expense.note}</span>}
                </div>
                <span className="expense-amount">-{budget.currency}{expense.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseLogger;
