import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/LegalPage.css';

function Privacy() {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <Link to="/" className="legal-logo">💰 Budget AI</Link>
        <Link to="/">Back to site</Link>
      </nav>

      <article>
        <h1>Privacy</h1>
        <p className="legal-lead">
          What this app stores, where it goes, and how to get rid of it.
        </p>

        <h2>What is stored</h2>
        <ul>
          <li>Your email address, so you can sign in.</li>
          <li>The answers you give the questionnaire, and the budget worked out from them.</li>
          <li>Any expenses you add, and transactions from statements you upload.</li>
          <li>A count of how often you use the features that cost money to run.</li>
        </ul>

        <h2>Where it is stored</h2>
        <p>
          In a Postgres database hosted by Supabase in Ireland (EU). Each row is tied to your
          account, and the database is configured to refuse requests for another account&rsquo;s
          rows.
        </p>

        <h2>Bank statements</h2>
        <p>
          Statement files you upload are read in your browser. The file itself is never sent
          anywhere. Only the resulting transactions — date, amount, description — are saved to
          your account.
        </p>

        <h2>What is sent to other companies</h2>
        <ul>
          <li>
            <strong>Anthropic</strong> — when you ask the advisor a question, your question and a
            summary of your budget are sent to Claude to answer it. When you look up deals or
            prices, your city is sent.
          </li>
          <li>
            <strong>Google</strong> — when you look at places nearby, your approximate location is
            sent to the Google Places API.
          </li>
          <li>
            <strong>Supabase</strong> — hosts the database and handles sign-in.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the site.
          </li>
        </ul>
        <p>Your data is not sold, and there is no advertising or tracking on this site.</p>

        <h2>Getting rid of it</h2>
        <p>
          Ask for your account to be deleted and everything tied to it goes with it — budgets,
          expenses, transactions. Under GDPR you can also ask for a copy of what is held.
        </p>

        <h2>Cookies</h2>
        <p>
          Only what is needed to keep you signed in. No analytics or advertising cookies.
        </p>

        <p className="legal-updated">Last updated: September 2026</p>
      </article>
    </div>
  );
}

export default Privacy;
