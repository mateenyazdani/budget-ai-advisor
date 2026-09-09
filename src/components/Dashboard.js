import React, { useState } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ExpenseLogger from './ExpenseLogger';
import PriceCheck from './PriceCheck';
import '../styles/Dashboard.css';

function Dashboard({ budget, onAskAdvisor, onStartOver, onGoToSmartSpending, onGoToBank }) {
  const [currentBudget, setCurrentBudget] = useState(budget);

  const expensePieData = Object.entries(currentBudget.categories)
    .filter(([key, value]) => value > 0 && !key.includes('Savings'))
    .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140'];
  const top5 = expensePieData.slice(0, 5);
  const categories = Object.entries(currentBudget.categories).map(([name, value]) => ({ name, amount: parseFloat(value.toFixed(2)) }));

  const handleExpenseAdd = (data) => {
    const totalSpent = data.expenses.reduce((sum, e) => sum + e.amount, 0);
    setCurrentBudget(prev => ({
      ...prev,
      surplus: prev.monthlyIncome - (prev.totalExpenses + totalSpent)
    }));
  };

  return (
    <div className="dashboard-container">
      <h2>Your Personalized Budget Dashboard</h2>
      <p className="location">{currentBudget.country}</p>

      <div className="summary-cards">
        <div className="card income"><label>Monthly Income</label><p className="amount">{currentBudget.currency}{currentBudget.monthlyIncome.toFixed(2)}</p></div>
        <div className="card expenses"><label>Total Expenses</label><p className="amount">{currentBudget.currency}{currentBudget.totalExpenses.toFixed(2)}</p></div>
        <div className={`card surplus ${currentBudget.surplus > 0 ? 'positive' : 'negative'}`}><label>Surplus/Deficit</label><p className="amount">{currentBudget.currency}{currentBudget.surplus.toFixed(2)}</p></div>
        <div className="card savings-rate"><label>Savings Rate</label><p className="amount">{currentBudget.savingsRate}%</p></div>
      </div>

      <div className="quick-actions">
        <button className="quick-card food" onClick={onGoToSmartSpending}>
          <span className="quick-icon" aria-hidden="true">🥗</span>
          <span className="quick-title">Cheap food &amp; deals</span>
          <span className="quick-sub">
            Places near you that fit the {currentBudget.currency}{Math.max(currentBudget.surplus, 0).toFixed(0)} you have left, plus current offers
          </span>
        </button>
        <button className="quick-card bank" onClick={onGoToBank}>
          <span className="quick-icon" aria-hidden="true">🏦</span>
          <span className="quick-title">Connect your bank</span>
          <span className="quick-sub">
            Link Revolut or another bank to see what you really spent
          </span>
        </button>
        <button className="quick-card advisor" onClick={onAskAdvisor}>
          <span className="quick-icon" aria-hidden="true">💬</span>
          <span className="quick-title">Ask the advisor</span>
          <span className="quick-sub">
            Get specific answers about your own numbers
          </span>
        </button>
      </div>

      <ExpenseLogger budget={currentBudget} onExpenseAdd={handleExpenseAdd} />

      <div className="charts-grid">
        <div className="chart-box"><h3>💰 Where Your Money Goes</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={expensePieData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value">{expensePieData.map((e, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        <div className="chart-box"><h3>📊 Top 5 Expenses</h3><ResponsiveContainer width="100%" height={300}><BarChart data={top5}><CartesianGrid /><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#667eea" /></BarChart></ResponsiveContainer></div>
      </div>

      <div className="detailed-breakdown"><h3>📋 Complete Budget Breakdown</h3><div className="categories-list">{categories.filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount).map((c, i) => (<div key={i} className="category-item"><div className="category-info"><span className="category-name">{c.name}</span><div className="progress-bar"><div className="progress-fill" style={{ width: `${(c.amount / currentBudget.monthlyIncome) * 100}%` }}></div></div></div><div className="category-amount">{currentBudget.currency}{c.amount.toFixed(2)}<span className="percentage">({((c.amount / currentBudget.monthlyIncome) * 100).toFixed(1)}%)</span></div></div>))}</div></div>

      <PriceCheck age={currentBudget.age} />

      <div className="recommendations-section"><h3>✨ Personalized Recommendations</h3><ul>{currentBudget.recommendations.map((rec, i) => (<li key={i}>{rec}</li>))}</ul></div>

      <div className="actions">
        <button className="btn-restart" onClick={onStartOver}>🔄 Start over with new answers</button>
      </div>
    </div>
  );
}

export default Dashboard;
