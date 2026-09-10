import React, { useState } from 'react';
import { calculateComprehensiveBudget, ACTIVITY_OPTIONS } from '../utils/budgetCalculator';
import '../styles/Questionnaire.css';

// Only four answers are needed to produce a useful budget. Everything else has
// a sensible default and lives behind a disclosure, so the first screen is
// short and nobody is gated behind four steps before seeing anything.
const DEFAULTS = {
  country: 'spain',
  monthlyIncome: '',
  age: '',
  maritalStatus: 'single',
  childCount: 0,
  rentOverride: '',
  billsOverride: '',
  currentSavings: '',
  usePublicTransport: 'yes',
  transportCard: 'yes',
  ridesPerMonth: 40,
  usesCar: 'no',
  gymOption: 'none',
  activities: [],
  subscriptions: [],
  hasPets: 'no',
  petCount: 0,
};

function ComprehensiveQuestionnaire({ onSubmit }) {
  const [form, setForm] = useState(DEFAULTS);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      const list = e.target.dataset.group === 'activities' ? 'activities' : 'subscriptions';
      setForm((prev) => ({
        ...prev,
        [list]: checked ? [...prev[list], name] : prev[list].filter((v) => v !== name),
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const income = parseFloat(form.monthlyIncome);
    const age = parseInt(form.age, 10);

    if (!Number.isFinite(income) || income <= 0) {
      setError('Enter your monthly income after tax.');
      return;
    }
    if (!Number.isFinite(age) || age < 16 || age > 100) {
      setError('Enter an age between 16 and 100.');
      return;
    }

    setBusy(true);
    try {
      const budget = calculateComprehensiveBudget({
        ...form,
        monthlyIncome: income,
        age,
        childCount: parseInt(form.childCount, 10) || 0,
        petCount: parseInt(form.petCount, 10) || 0,
        rentOverride: form.rentOverride,
        billsOverride: form.billsOverride,
        currentSavings: form.currentSavings,
      });
      onSubmit(budget, form);
    } catch (err) {
      setError('Something went wrong working that out. Check your answers.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setup">
      <div className="setup-head">
        <h1>Let&rsquo;s build your budget</h1>
        <p>A few answers is enough. You can add detail afterwards.</p>
      </div>

      <form onSubmit={submit} className="setup-form">
        <div className="field">
          <label htmlFor="country">Where do you live?</label>
          <select id="country" name="country" value={form.country} onChange={update}>
            <option value="spain">Spain</option>
            <option value="usa">United States</option>
            <option value="australia">Australia</option>
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="income">Monthly income after tax</label>
            <input
              id="income" name="monthlyIncome" type="number" inputMode="decimal"
              value={form.monthlyIncome} onChange={update} placeholder="2,500" min="0"
            />
          </div>
          <div className="field">
            <label htmlFor="age">Your age</label>
            <input
              id="age" name="age" type="number" inputMode="numeric"
              value={form.age} onChange={update} placeholder="30" min="16" max="100"
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="marital">Living situation</label>
            <select id="marital" name="maritalStatus" value={form.maritalStatus} onChange={update}>
              <option value="single">On my own</option>
              <option value="married">With a partner</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="kids">Children you support</label>
            <input
              id="kids" name="childCount" type="number" inputMode="numeric"
              value={form.childCount} onChange={update} min="0" max="8"
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="rent">Rent or mortgage a month</label>
            <input
              id="rent" name="rentOverride" type="number" inputMode="decimal"
              value={form.rentOverride} onChange={update} placeholder="Leave blank to estimate" min="0"
            />
          </div>
          <div className="field">
            <label htmlFor="bills">Utilities a month</label>
            <input
              id="bills" name="billsOverride" type="number" inputMode="decimal"
              value={form.billsOverride} onChange={update} placeholder="Power, water, internet, phone" min="0"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="savings">Savings you already have</label>
          <input
            id="savings" name="currentSavings" type="number" inputMode="decimal"
            value={form.currentSavings} onChange={update} placeholder="Optional — shows how long it would last" min="0"
          />
        </div>

        <button
          type="button"
          className="disclosure"
          onClick={() => setShowMore(!showMore)}
          aria-expanded={showMore}
        >
          <span>{showMore ? '−' : '+'} Add detail — transport, gym, subscriptions, pets</span>
          <span className="disclosure-note">Optional. Makes the estimate more accurate.</span>
        </button>

        {showMore && (
          <div className="more-detail">
            <div className="field-row">
              <div className="field">
                <label htmlFor="transport">Public transport</label>
                <select id="transport" name="usePublicTransport" value={form.usePublicTransport} onChange={update}>
                  <option value="yes">I use it</option>
                  <option value="no">I don&rsquo;t</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="car">A car</label>
                <select id="car" name="usesCar" value={form.usesCar} onChange={update}>
                  <option value="no">No car</option>
                  <option value="yes">I run one</option>
                </select>
              </div>
            </div>

            {form.usePublicTransport === 'yes' && (
              <div className="field-row">
                <div className="field">
                  <label htmlFor="card">Travel card</label>
                  <select id="card" name="transportCard" value={form.transportCard} onChange={update}>
                    <option value="yes">Monthly pass</option>
                    <option value="no">I pay per ride</option>
                  </select>
                </div>
                {form.transportCard === 'no' && (
                  <div className="field">
                    <label htmlFor="rides">Rides a month</label>
                    <input id="rides" name="ridesPerMonth" type="number" value={form.ridesPerMonth} onChange={update} min="0" max="300" />
                  </div>
                )}
              </div>
            )}

            <div className="field-row">
              <div className="field">
                <label htmlFor="gym">Gym</label>
                <select id="gym" name="gymOption" value={form.gymOption} onChange={update}>
                  <option value="none">No gym</option>
                  <option value="budget">Budget</option>
                  <option value="midrange">Mid-range</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="pets">Pets</label>
                <input id="pets" name="petCount" type="number" value={form.petCount} onChange={update} min="0" max="8"
                  onFocus={() => setForm((p) => ({ ...p, hasPets: 'yes' }))} />
              </div>
            </div>

            <div className="field">
              <label>Sports and activities you pay for</label>
              <div className="chip-group">
                {ACTIVITY_OPTIONS.map((a) => (
                  <label key={a.id} className={form.activities.includes(a.id) ? 'chip on' : 'chip'}>
                    <input
                      type="checkbox" name={a.id} data-group="activities"
                      checked={form.activities.includes(a.id)} onChange={update}
                    />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Subscriptions</label>
              <div className="chip-group">
                {[['netflix', 'Netflix'], ['spotify', 'Spotify'], ['icloud', 'iCloud+'], ['other', 'Other apps']].map(([id, label]) => (
                  <label key={id} className={form.subscriptions.includes(id) ? 'chip on' : 'chip'}>
                    <input type="checkbox" name={id} checked={form.subscriptions.includes(id)} onChange={update} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <div className="setup-error">{error}</div>}

        <button type="submit" className="btn-build" disabled={busy}>
          {busy ? 'Working it out…' : 'Build my budget'}
        </button>

        <p className="setup-note">
          Figures are modelled estimates for your country and household, not your real spending.
          You can check them against a bank statement afterwards.
        </p>
      </form>
    </div>
  );
}

export default ComprehensiveQuestionnaire;
