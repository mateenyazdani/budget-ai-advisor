import React from 'react';
import { Link } from 'react-router-dom';
import Dashboard from './Dashboard';
import { Wordmark } from './Icons';
import { calculateComprehensiveBudget } from '../utils/budgetCalculator';
import '../styles/Sample.css';

// A worked example on the public side, so someone can see what the product
// actually produces before being asked to create an account.
const SAMPLE_ANSWERS = {
  country: 'spain',
  monthlyIncome: 2400,
  age: 29,
  maritalStatus: 'single',
  childCount: 0,
  usePublicTransport: 'yes',
  transportCard: 'yes',
  ridesPerMonth: 40,
  usesCar: 'no',
  gymOption: 'budget',
  activities: ['padel'],
  subscriptions: ['netflix', 'spotify'],
  hasPets: 'no',
  petCount: 0,
  rentOverride: 850,
  billsOverride: 140,
  currentSavings: 4200,
};

function SampleBudget() {
  const budget = calculateComprehensiveBudget(SAMPLE_ANSWERS);

  return (
    <div className="sample-page">
      <nav className="sample-nav">
        <Link to="/" className="sample-logo"><Wordmark /></Link>
        <Link to="/signin" className="btn-cta small">Build mine</Link>
      </nav>

      <div className="sample-banner">
        <strong>This is a sample.</strong> Someone on €2,400 a month in Madrid, renting at €850.
        Everything below is live — open a group, click any figure to change it.
        <Link to="/signin">Build your own →</Link>
      </div>

      <main className="App-main">
        <Dashboard budget={{ ...budget, answers: SAMPLE_ANSWERS }} onStartOver={() => {}} />
      </main>

      <footer className="sample-footer">
        <p>Nothing here is saved. Create an account to keep your own figures.</p>
        <Link to="/signin" className="btn-cta">Build my budget</Link>
      </footer>
    </div>
  );
}

export default SampleBudget;
