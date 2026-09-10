import React from 'react';
import { Wordmark, ChartIcon, ChatIcon, BasketIcon, TagIcon, TrainIcon, BankIcon } from './Icons';
import ProductShot from './ProductShot';
import '../styles/Landing.css';

const STATS = [
  { figure: '37', label: 'Expense categories' },
  { figure: '3', label: 'Countries' },
  { figure: '4', label: 'Questions to set up' },
  { figure: 'Free', label: 'To use' },
];

const FEATURES = [
  {
    Icon: ChartIcon,
    title: 'A budget built from your life',
    body: 'Answer four short steps and get a full monthly breakdown — rent, transport, food, gym, padel, subscriptions — modelled on real costs for your country and age.',
  },
  {
    Icon: ChatIcon,
    title: 'An advisor that reads your numbers',
    body: 'Ask what to cut and get an answer about your actual budget, not generic advice. It will tell you when your figures do not add up.',
  },
  {
    Icon: BasketIcon,
    title: 'Cheap food and real offers',
    body: 'Places near you that fit what you have left this month, plus current deals found across Groupon, TheFork and local sites.',
  },
  {
    Icon: TagIcon,
    title: 'No invented discounts',
    body: 'Every offer carries the link it came from, so you can check it before you go. If nothing real is found, you get nothing — never a made-up bargain.',
  },
  {
    Icon: TrainIcon,
    title: 'Prices that are actually current',
    body: 'Looks up today’s transport fares and subscription prices for your city and age, so you can see whether a travel card beats paying per ride.',
  },
  {
    Icon: BankIcon,
    title: 'Check it against reality',
    body: 'Drop in a statement export from Revolut or any bank and see what you actually spent against what you planned. The file is read in your browser and never uploaded.',
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
    q: 'Does it connect to my bank?',
    a: 'Not automatically. Reading bank accounts directly is regulated under PSD2 and the providers that hold that licence now start at a few hundred a month. Instead you export a statement from your bank — four taps in Revolut — and drop the file in. It is read in your browser, so the file never leaves your device.',
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
    a: 'Your budget and expenses are saved to your account in a database in Ireland, so they are there when you come back. The database refuses to hand your rows to anyone else. Ask for your account to be deleted and it all goes with it.',
  },
];

function Landing({ onGetStarted }) {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Wordmark className="landing-logo" />
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
        </div>
        <button className="btn-cta small" onClick={onGetStarted}>Open the app</button>
      </nav>

      <header className="landing-hero">
        <span className="hero-eyebrow">Built for Spain · Works in the USA and Australia</span>
        <h1>Know exactly<br />where it goes.</h1>
        <p className="hero-body">
          A full monthly budget in about a minute. Then the cheaper option nearby, what things
          really cost today, and an advisor that reads your own numbers.
        </p>
        <div className="hero-actions">
          <button className="btn-cta" onClick={onGetStarted}>Get started</button>
          <a className="btn-text" href="#features">See what it does &rsaquo;</a>
        </div>

        <div className="hero-shot">
          <ProductShot />
        </div>
      </header>

      <section className="stat-band">
        <div className="stat-row">
          {STATS.map((s) => (
            <div key={s.label} className="stat">
              <span className="stat-figure">{s.figure}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="features">
        <span className="section-eyebrow">What it does</span>
        <h2>Everything in one place</h2>
        <p className="section-sub">
          A budget is only useful if it changes what you spend. This does both halves.
        </p>

        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon"><f.Icon /></span>
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
        <Wordmark />
        <span className="footer-note">
          Budget figures are estimates, not financial advice. Offers and prices are found on the web —
          always check the source link.
        </span>
      </footer>
    </div>
  );
}

export default Landing;
