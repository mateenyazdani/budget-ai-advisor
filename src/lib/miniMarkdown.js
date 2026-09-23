import React from 'react';

// The advisor's replies were rendered as one plain-text block, so a three-
// point answer read as a wall rather than three points. This is not a
// markdown library — it is the three things a short chat reply actually
// uses (bold, bullets, paragraph breaks) — kept dependency-free and safe:
// it builds React elements directly, never raw HTML, so nothing the model
// writes can inject a tag into the page.
function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return part ? <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment> : null;
  });
}

export function MiniMarkdown({ text }) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let bulletItems = null;

  const flushBullets = () => {
    if (bulletItems) {
      blocks.push(<ul key={`ul-${blocks.length}`} className="advisor-list">{bulletItems}</ul>);
      bulletItems = null;
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flushBullets(); return; }

    const bulletMatch = line.match(/^[-•]\s+(.*)/);
    if (bulletMatch) {
      if (!bulletItems) bulletItems = [];
      bulletItems.push(<li key={`li-${i}`}>{renderInline(bulletMatch[1], `li-${i}`)}</li>);
    } else {
      flushBullets();
      blocks.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>);
    }
  });
  flushBullets();

  return <>{blocks}</>;
}
