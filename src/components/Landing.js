import React from 'react';
import { Link } from 'react-router-dom';
import { Wordmark, ChartIcon, ChatIcon, BasketIcon, TagIcon, TrainIcon, BankIcon } from './Icons';
import ProductShot from './ProductShot';
import '../styles/Landing.css';

const STATS = [
  { figure: 'Nearby', label: 'Real places, with real distances' },
  { figure: 'Verified', label: 'Every offer links to its source' },
  { figure: '11', label: 'Categories, and growing' },
  { figure: 'Free', label: 'No card, no subscription' },
];

const FEATURES = [
  {
    Icon: BasketIcon,
    title: 'The deal, attached to the place',
    body: 'Search padel and get the courts near you with the price on them — a court at EUR 6 an hour, 1.2 km away — rather than a list of venues and a separate pile of coupons.',
  },
  {
    Icon: ChartIcon,
    title: 'Eleven categories, and growing',
    body: 'Food, padel, tennis, gyms, cinema, groceries, going out, hair, shopping, travel — or type anything at all and it will go looking.',
  },
  {
    Icon: ChatIcon,
    title: 'A budget behind it',
    body: 'Know what you actually have spare before you book anything, and ask an advisor about your own numbers. Secondary to the deals, but there when you want it.',
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
  { n: '1', title: 'Say where you are', body: 'Your city, or let it find you. Madrid, Barcelona, anywhere.' },
  { n: '2', title: 'Pick what you want', body: 'Padel, dinner, a gym, a haircut — or type anything at all.' },
  { n: '3', title: 'Get the price, not a listing', body: 'Places near you with the offer attached, each linking to where it was found.' },
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
        <h1>Discover more.<br />Spend less.</h1>
        <p className="hero-body">
          The best deals near you — food, padel, gyms, cinema, travel — with the offer attached to
          the place, not buried in a coupon site. And a budget behind it, so you always know what
          you have to spend.
        </p>
        <div className="hero-actions">
          <button className="btn-cta" onClick={onGetStarted}>Get started</button>
          <Link className="btn-text" to="/sample">Try a sample Madrid budget &rsaquo;</Link>
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
        <h2>Bargains, where you are</h2>
        <p className="section-sub">
          Most apps tell you what you spent. This one tells you where to spend less.
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
        <h2>Three taps to a better price</h2>

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
        <h2>See what&rsquo;s near you</h2>
        <p>No card, no subscription. Free while it grows.</p>
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
