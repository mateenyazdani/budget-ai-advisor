import React, { useState } from 'react';
import { toolkitForCity } from '../lib/countryToolkits';
import '../styles/CountryPassport.css';

// A directory of real local services, not a live price feed — every link
// goes to the provider's own real site. Collapsed by default so it reads as
// a shortcut for someone who wants it, not a wall pushed on everyone.
function CountryPassport({ city }) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState('all');
  const toolkit = toolkitForCity(city);

  if (!toolkit) return null;

  const groups = activeGroup === 'all'
    ? toolkit.groups
    : toolkit.groups.filter((g) => g.label === activeGroup);

  return (
    <div className="passport">
      <button type="button" className="passport-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="passport-flag" aria-hidden="true">{toolkit.flag}</span>
        <span className="passport-title">{toolkit.city} toolkit</span>
        <span className="passport-sub">SIM, food and transport, the local names worth knowing</span>
        <span className={`passport-chevron ${open ? 'open' : ''}`} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="passport-body">
          <div className="passport-filters">
            <button
              type="button"
              className={`passport-filter ${activeGroup === 'all' ? 'on' : ''}`}
              onClick={() => setActiveGroup('all')}
            >
              All essentials
            </button>
            {toolkit.groups.map((g) => (
              <button
                key={g.label}
                type="button"
                className={`passport-filter ${activeGroup === g.label ? 'on' : ''}`}
                onClick={() => setActiveGroup(g.label)}
              >
                {g.label}
              </button>
            ))}
          </div>

          {groups.map((g) => (
            <div key={g.label} className="passport-group">
              <span className="passport-group-label">{g.label}</span>
              <div className="passport-grid">
                {g.items.map((it) => (
                  <div key={it.name} className="passport-card">
                    <span className="passport-card-name">{it.name}</span>
                    <p className="passport-card-note">{it.note}</p>
                    <a
                      className="passport-card-cta"
                      href={it.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit site ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="passport-note">
            A directory, not a price list — check each provider's own site for what they actually
            charge today.
          </p>
        </div>
      )}
    </div>
  );
}

export default CountryPassport;
