import React from 'react';
import '../styles/Results.css';

function Results({ budget, onAskAdvisor, onStartOver }) {
  const getStatusColor = (surplus) => {
    if (surplus > 300) return 'green';
    if (surplus > 0) return 'yellow';
    return 'red';
  };

  return (
    <div className="results-container">
      <h2>Your Personalized Budget</h2>
      <p className="location">{budget.country}</p>

      {/* Income Summary */}
      <div className="income-summary">
        <div className="income-box">
          <label>Monthly Income</label>
          <p className="amount">{budget.currency}{budget.monthlyIncome.toFixed(2)}</p>
        </div>
        <div className="income-box">
          <label>Total Expenses</label>
          <p className="amount">{budget.currency}{budget.totalExpenses.toFixed(2)}</p>
        </div>
        <div className={`income-box surplus ${getStatusColor(budget.surplus)}`}>
          <label>Monthly Surplus</label>
          <p className="amount">{budget.currency}{budget.surplus.toFixed(2)}</p>
        </div>
      </div>

      {/* Budget Breakdown */}
      <div className="budget-breakdown">
        <h3>Budget Breakdown</h3>
        <div className="categories">
          {Object.entries(budget.categories).map(([category, amount]) => (
            <div key={category} className="category-row">
              <div className="category-info">
                <span className="category-name">
                  {formatCategoryName(category)}
                </span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(amount / budget.monthlyIncome) * 100}%` }}
                  ></div>
                </div>
              </div>
              <span className="category-amount">
                {budget.currency}{amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="recommendations">
        <h3>Personalized Recommendations</h3>
        <ul>
          {budget.recommendations.map((rec, idx) => (
            <li key={idx}>{rec}</li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="actions">
        <button className="btn-advisor" onClick={onAskAdvisor}>
          💬 Ask AI Advisor
        </button>
        <button className="btn-restart" onClick={onStartOver}>
          🔄 Start Over
        </button>
      </div>

      {/* Savings Info */}
      <div className="savings-info">
        <p>You're saving <strong>{budget.savingsPercentage}%</strong> of your income</p>
      </div>
    </div>
  );
}

function formatCategoryName(category) {
  return category
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export default Results;
