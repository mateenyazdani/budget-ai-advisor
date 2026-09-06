import React, { useState } from 'react';
import { calculateBudget } from '../utils/budgetCalculator';
import '../styles/Questionnaire.css';

function Questionnaire({ onSubmit }) {
  const [country, setCountry] = useState('spain');
  const [jobStatus, setJobStatus] = useState('employed');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [age, setAge] = useState('');
  const [hasKids, setHasKids] = useState('no');
  const [maritalStatus, setMaritalStatus] = useState('single');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const budget = calculateBudget({
        country,
        jobStatus,
        monthlyIncome: parseFloat(monthlyIncome),
        age: parseInt(age),
        hasKids: hasKids === 'yes',
        maritalStatus,
      });

      onSubmit(budget);
    } catch (error) {
      console.error('Error calculating budget:', error);
      alert('Error calculating budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="questionnaire-container">
      <h2>Tell us about yourself</h2>
      <p>We'll create a personalized budget based on your situation</p>

      <form onSubmit={handleSubmit} className="questionnaire-form">
        {/* Country Selection */}
        <div className="form-group">
          <label htmlFor="country">Which country do you live in?</label>
          <select 
            id="country" 
            value={country} 
            onChange={(e) => setCountry(e.target.value)}
            required
          >
            <option value="spain">Spain</option>
            <option value="usa">USA</option>
            <option value="australia">Australia</option>
          </select>
        </div>

        {/* Job Status */}
        <div className="form-group">
          <label htmlFor="jobStatus">Employment Status</label>
          <select 
            id="jobStatus" 
            value={jobStatus} 
            onChange={(e) => setJobStatus(e.target.value)}
            required
          >
            <option value="employed">Employed</option>
            <option value="freelance">Freelance/Self-employed</option>
            <option value="student">Student</option>
            <option value="unemployed">Unemployed</option>
          </select>
        </div>

        {/* Monthly Income */}
        <div className="form-group">
          <label htmlFor="monthlyIncome">Monthly Income/Budget (€/$)</label>
          <input 
            type="number" 
            id="monthlyIncome"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
            placeholder="e.g., 2500"
            required
            min="0"
          />
        </div>

        {/* Age */}
        <div className="form-group">
          <label htmlFor="age">Age</label>
          <input 
            type="number" 
            id="age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g., 28"
            required
            min="18"
            max="100"
          />
        </div>

        {/* Marital Status */}
        <div className="form-group">
          <label htmlFor="maritalStatus">Marital Status</label>
          <select 
            id="maritalStatus" 
            value={maritalStatus} 
            onChange={(e) => setMaritalStatus(e.target.value)}
            required
          >
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="partnered">In a relationship</option>
          </select>
        </div>

        {/* Kids */}
        <div className="form-group">
          <label htmlFor="hasKids">Do you have children?</label>
          <select 
            id="hasKids" 
            value={hasKids} 
            onChange={(e) => setHasKids(e.target.value)}
            required
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Get My Budget'}
        </button>
      </form>
    </div>
  );
}

export default Questionnaire;
