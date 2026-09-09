import React, { useState } from 'react';
import { calculateComprehensiveBudget } from '../utils/budgetCalculator';
import '../styles/Questionnaire.css';

function ComprehensiveQuestionnaire({ onSubmit }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    country: 'spain',
    monthlyIncome: '',
    age: '',
    hasKids: 'no',
    maritalStatus: 'single',
    usePublicTransport: 'yes',
    transportCard: 'yes',
    ridesPerMonth: 40,
    usesCar: 'no',
    gymOption: 'none',
    padelOption: 'none',
    otherSportsOption: 'none',
    subscriptions: [],
    hasPets: 'no',
    petCount: 0,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        subscriptions: checked ? [...prev.subscriptions, name] : prev.subscriptions.filter(s => s !== name)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleNext = () => {
    if (step === 1 && (!formData.monthlyIncome || !formData.age)) {
      alert('Please fill in all fields');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const budget = calculateComprehensiveBudget({
        ...formData,
        monthlyIncome: parseFloat(formData.monthlyIncome),
        age: parseInt(formData.age),
        petCount: parseInt(formData.petCount) || 0,
      });
      onSubmit(budget);
    } catch (error) {
      console.error('Error:', error);
      alert('Error calculating budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="questionnaire-container">
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }}></div></div>
      <form onSubmit={step === 4 ? handleSubmit : undefined}>
        {step === 1 && (
          <div className="form-step">
            <h2>Step 1: Your Profile</h2>
            <p>Tell us about yourself</p>
            <div className="form-group">
              <label>Which country do you live in?</label>
              <select name="country" value={formData.country} onChange={handleInputChange}>
                <option value="spain">🇪🇸 Spain</option>
                <option value="usa">🇺🇸 USA</option>
                <option value="australia">🇦🇺 Australia</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Monthly Income (€/$)</label>
                <input type="number" name="monthlyIncome" value={formData.monthlyIncome} onChange={handleInputChange} placeholder="e.g., 2500" required min="0" />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleInputChange} placeholder="e.g., 28" required min="18" max="100" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Marital Status</label>
                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange}>
                  <option value="single">Single</option>
                  <option value="married">Married/Partnered</option>
                </select>
              </div>
              <div className="form-group">
                <label>Do you have children?</label>
                <select name="hasKids" value={formData.hasKids} onChange={handleInputChange}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="form-step">
            <h2>Step 2: Transport & Living</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Do you use public transport?</label>
                <select name="usePublicTransport" value={formData.usePublicTransport} onChange={handleInputChange}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Do you own/use a car?</label>
                <select name="usesCar" value={formData.usesCar} onChange={handleInputChange}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            {formData.usePublicTransport === 'yes' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Do you have a travel card / monthly pass?</label>
                  <select name="transportCard" value={formData.transportCard} onChange={handleInputChange}>
                    <option value="yes">Yes — monthly pass</option>
                    <option value="no">No — I pay per ride</option>
                  </select>
                  <span className="field-hint">
                    Passes are usually cheaper from about 30 rides a month, and under-26s often pay much less.
                  </span>
                </div>
                {formData.transportCard === 'no' && (
                  <div className="form-group">
                    <label>Roughly how many rides a month?</label>
                    <input type="number" name="ridesPerMonth" value={formData.ridesPerMonth} onChange={handleInputChange} min="0" max="300" />
                  </div>
                )}
              </div>
            )}
            <div className="form-group">
              <label>Do you have pets?</label>
              <select name="hasPets" value={formData.hasPets} onChange={handleInputChange}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            {formData.hasPets === 'yes' && (
              <div className="form-group">
                <label>Number of pets?</label>
                <input type="number" name="petCount" value={formData.petCount} onChange={handleInputChange} min="0" max="5" />
              </div>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="form-step">
            <h2>Step 3: Sports & Fitness</h2>
            <div className="form-group">
              <label>Gym Membership</label>
              <select name="gymOption" value={formData.gymOption} onChange={handleInputChange}>
                <option value="none">None</option>
                <option value="budget">Budget (€25-35/month)</option>
                <option value="midrange">Mid-range (€40-50/month)</option>
                <option value="premium">Premium (€60-80/month)</option>
              </select>
            </div>
            <div className="form-group">
              <label>🎾 Padel (Popular in Spain!)</label>
              <select name="padelOption" value={formData.padelOption} onChange={handleInputChange}>
                <option value="none">Don't play</option>
                <option value="casual">Casual (1-2x/month, ~€40)</option>
                <option value="regular">Regular (1-2x/week, ~€80)</option>
                <option value="serious">Serious (3x+/week, ~€120)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Other Sports/Activities</label>
              <select name="otherSportsOption" value={formData.otherSportsOption} onChange={handleInputChange}>
                <option value="none">None</option>
                <option value="casual">Casual (running, yoga, etc.)</option>
                <option value="active">Active (classes, coaching)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Subscriptions</label>
              <div className="checkbox-group">
                <label><input type="checkbox" name="netflix" checked={formData.subscriptions.includes('netflix')} onChange={handleInputChange} /> Netflix</label>
                <label><input type="checkbox" name="spotify" checked={formData.subscriptions.includes('spotify')} onChange={handleInputChange} /> Spotify</label>
                <label><input type="checkbox" name="icloud" checked={formData.subscriptions.includes('icloud')} onChange={handleInputChange} /> iCloud+</label>
                <label><input type="checkbox" name="other" checked={formData.subscriptions.includes('other')} onChange={handleInputChange} /> Other Apps</label>
              </div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="form-step">
            <h2>Step 4: Review Your Info</h2>
            <p>Ready to generate your personalized budget?</p>
            <div className="review-box">
              <p><strong>Country:</strong> {formData.country.toUpperCase()}</p>
              <p><strong>Monthly Income:</strong> {formData.monthlyIncome}</p>
              <p><strong>Age:</strong> {formData.age}</p>
              <p><strong>Status:</strong> {formData.maritalStatus} {formData.hasKids === 'yes' ? '+ Kids' : ''}</p>
              <p><strong>Transport:</strong> Public: {formData.usePublicTransport === 'yes' ? '✓' : '✗'}, Car: {formData.usesCar === 'yes' ? '✓' : '✗'}</p>
              <p><strong>Fitness:</strong> {formData.gymOption} {formData.padelOption !== 'none' && `+ Padel: ${formData.padelOption}`}</p>
            </div>
          </div>
        )}
        <div className="button-group">
          {step > 1 && <button type="button" className="btn-secondary" onClick={handleBack}>← Back</button>}
          {step < 4 && <button type="button" className="btn-primary" onClick={handleNext}>Next →</button>}
          {step === 4 && <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Calculating...' : '✨ Generate My Budget'}</button>}
        </div>
      </form>
    </div>
  );
}

export default ComprehensiveQuestionnaire;
