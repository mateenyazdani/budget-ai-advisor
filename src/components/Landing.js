import React from 'react';
import '../styles/Landing.css';

const STATS = [
  { figure: '37', label: 'Expense categories' },
  { figure: '3', label: 'Countries' },
  { figure: '4', label: 'Questions to set up' },
  { figure: 'Free', label: 'To use' },
];

const FEATURES = [
  {
    icon: '📊',
    title: 'A budget built from your life',
    body: 'Answer four short steps and get a full monthly breakdown — rent, transport, food, gym, padel, subscriptions — modelled on real costs for your country and age.',
  },
  {
    icon: '💬',
    title: 'An advisor that reads your numbers',
    body: 'Ask what to cut and get an answer about your actual budget, not generic advice. It will tell you when your figures do not add up.',
  },
  {
    icon: '🥗',
    title: 'Cheap food and real offers',
    body: 'Places near you that fit what you have left this month, plus current deals found across Groupon, TheFork and local sites.',
  },
  {
    icon: '🏷️',
    title: 'No invented discounts',
    body: 'Every offer carries the link it came from, so you can check it before you go. If nothing real is found, you get nothing — never a made-up bargain.',
  },
  {
    icon: '🚇',
    title: 'Prices that are actually current',
    body: 'Looks up today’s transport fares and subscription prices for your city and age, so you can see whether a travel card beats paying per ride.',
  },
  {
    icon: '🏦',
    title: 'Connect your bank',
    body: 'Link Revolut or another bank through a regulated provider to see what you really spent. You log in on your bank’s own page, never here.',
  },
];

const STEPS = [
  { n: '1', title: 'Answer four steps', body: 'Income, age, transport, sports, subscriptions. Takes about a minute.' },
  { n: '2', title: 'See where it goes', body: 'A full breakdown across 37 categories, with charts and what is left over.' },
  { n: '3', title: 'Spend less of it', body: 'Cheaper places nearby, real offers, live prices, and an advisor to ask.' },
];

const FAQS = [
  {
    q: 'Is it free?',
    a: 'Yes. There is no payment, no subscription and no card required.',
  },
  {
    q: 'Can it really connect to Revolut?',
    a: 'Yes, through GoCardless, which is a regulated account information provider. Revolut does not give apps direct access to personal accounts — that is regulated under PSD2 — so every budgeting app uses a provider like this. You authorise it on your bank’s own page and your bank login never touches this app.',
  },
  {
    q: 'Where do the deals come from?',
    a: 'They are found by searching the web across Groupon, TheFork, Tiendeo and merchants’ own sites. Each one shows the link it came from. Offers can expire or change, so check the source before relying on one.',
  },
  {
    q: 'Are the budget figures real?',
    a: 'The starting budget is modelled from typical costs for your country, age and household — they are estimates, not your actual spending. The live price lookup and the bank connection are what replace them with real numbers.',
  },
  {
    q: 'What happens to my data?',
    a: 'Your answers stay in your own browser. Bank access goes through GoCardless and can be disconnected at any time from the bank screen.',
  },
];

function Landing({ onGetStarted }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="landing-logo">💰 Budget AI</span>
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
        </div>
        <button className="btn-cta small" onClick={onGetStarted}>Open the app</button>
      </nav>

      <header className="landing-hero">
        <span className="hero-eyebrow">Built for Spain · Works in the USA and Australia</span>
        <h1>
          See where your money goes.
          <span className="hero-accent">Then spend less of it.</span>
        </h1>
        <p className="hero-body">
          Build a full monthly budget in about a minute, then find cheaper places near you, check
          what things actually cost today, and ask an AI advisor what to change.
        </p>
        <div className="hero-actions">
          <button className="btn-cta" onClick={onGetStarted}>Get started — it&rsquo;s free →</button>
          <a className="btn-ghost" href="#features">See what it does</a>
        </div>

        <div className="stat-row">
          {STATS.map((s) => (
            <div key={s.label} className="stat">
              <span className="stat-figure">{s.figure}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="landing-section" id="features">
        <span className="section-eyebrow">What it does</span>
        <h2>Everything in one place</h2>
        <p className="section-sub">
          A budget is only useful if it changes what you spend. This does both halves.
        </p>

        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon" aria-hidden="true">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section steps-section" id="how">
        <span className="section-eyebrow">How it works</span>
        <h2>Three steps, about a minute</h2>

        <div className="step-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="step-card">
              <span className="step-number">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="faq">
        <span className="section-eyebrow">FAQ</span>
        <h2>Questions, answered</h2>

        <div className="faq-list">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <h2>Find out where it&rsquo;s going</h2>
        <p>No card, no signup fee, about a minute to set up.</p>
        <button className="btn-cta" onClick={onGetStarted}>Get started free →</button>
      </section>

      <footer className="landing-footer">
        <span>💰 Budget AI</span>
        <span className="footer-note">
          Budget figures are estimates, not financial advice. Offers and prices are found on the web —
          always check the source link.
        </span>
      </footer>
    </div>
  );
}

export default Landing;
