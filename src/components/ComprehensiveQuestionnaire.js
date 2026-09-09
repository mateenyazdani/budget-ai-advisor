import React, { useState } from 'react';
import { calculateComprehensiveBudget, ACTIVITY_OPTIONS } from '../utils/budgetCalculator';
import '../styles/Questionnaire.css';

function ComprehensiveQuestionnaire({ onSubmit }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    country: 'spain',
    monthlyIncome: '',
    age: '',
    childCount: 0,
    maritalStatus: 'single',
    usePublicTransport: 'yes',
    transportCard: 'yes',
    ridesPerMonth: 40,
    usesCar: 'no',
    gymOption: 'none',
    activities: [],
    subscriptions: [],
    hasPets: 'no',
    petCount: 0,
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      const list = e.target.dataset.group === 'activities' ? 'activities' : 'subscriptions';
      setFormData(prev => ({
        ...prev,
        [list]: checked ? [...prev[list], name] : prev[list].filter(v => v !== name)
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
        childCount: parseInt(formData.childCount) || 0,
      });
      onSubmit(budget, formData);
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
                <label>How many children do you support?</label>
                <input type="number" name="childCount" value={formData.childCount} onChange={handleInputChange} min="0" max="8" />
                <span className="field-hint">
                  Each child adds childcare, food, clothing and health costs, so the number matters.
                </span>
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
              <label>Sports and activities you pay for</label>
              <div className="checkbox-group">
                {ACTIVITY_OPTIONS.map((a) => (
                  <label key={a.id}>
                    <input
                      type="checkbox"
                      name={a.id}
                      data-group="activities"
                      checked={formData.activities.includes(a.id)}
                      onChange={handleInputChange}
                    />
                    {a.label}
                  </label>
                ))}
              </div>
              <span className="field-hint">Pick any you pay for. Leave blank if none.</span>
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
              <p><strong>Status:</strong> {formData.maritalStatus}{Number(formData.childCount) > 0 ? ` · ${formData.childCount} child${Number(formData.childCount) > 1 ? 'ren' : ''}` : ''}</p>
              <p><strong>Transport:</strong> Public: {formData.usePublicTransport === 'yes' ? '✓' : '✗'}, Car: {formData.usesCar === 'yes' ? '✓' : '✗'}</p>
              <p><strong>Fitness:</strong> {formData.gymOption === 'none' ? 'No gym' : formData.gymOption}{formData.activities.length > 0 ? ` · ${formData.activities.length} activity${formData.activities.length > 1 ? 'ies' : ''}` : ''}</p>
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
