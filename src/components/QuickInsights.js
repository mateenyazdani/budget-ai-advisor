import React from 'react';
import '../styles/QuickInsights.css';

// A horizontal row of real shortcuts, not decoration — every item does one
// concrete thing to the page it sits on. The one visual borrow from the
// brighter reference: each icon sits in its own coloured ring, so the row
// reads as a bright accent against an otherwise calm, minimal page rather
// than a full repaint of it.
function QuickInsights({ insight, currency, onSetBudget, onPickCategory, onFriendsOnly, friendsCount }) {
  const items = [
    insight?.safeToday > 0 && {
      key: 'save',
      icon: '💰',
      ring: 'ring-green',
      label: `Save ${currency}${insight.safeToday} today?`,
      onClick: () => onSetBudget(insight.safeToday),
    },
    {
      key: 'cheap-eats',
      icon: '🍽️',
      ring: 'ring-orange',
      label: 'Cheap eats near you',
      onClick: () => onPickCategory('Dining', 15),
    },
    {
      key: 'padel',
      icon: '🎾',
      ring: 'ring-blue',
      label: 'Padel courts',
      onClick: () => onPickCategory('Padel', null),
    },
    friendsCount > 0 && {
      key: 'friends',
      icon: '👥',
      ring: 'ring-pink',
      label: `Friends' spots (${friendsCount})`,
      onClick: onFriendsOnly,
    },
    {
      key: 'ask',
      icon: '💬',
      ring: 'ring-purple',
      label: 'Ask the advisor',
      onClick: () => window.dispatchEvent(new CustomEvent('open-bargain-advisor')),
    },
  ].filter(Boolean);

  return (
    <div className="quick-insights">
      {items.map((it) => (
        <button key={it.key} type="button" className="qi-item" onClick={it.onClick}>
          <span className={`qi-icon ${it.ring}`}>{it.icon}</span>
          <span className="qi-label">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

export default QuickInsights;
