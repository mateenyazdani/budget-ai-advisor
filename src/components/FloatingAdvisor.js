import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MiniMarkdown } from '../lib/miniMarkdown';
import '../styles/FloatingAdvisor.css';

const QUICK_PROMPTS = [
  'Can I afford a €150 weekend trip?',
  'Where did most of my money go?',
  'What should I cut first?',
];

// Reachable from anywhere signed in with a budget, rather than a page you
// have to navigate away to. Shares the same backend and reply format as the
// full advisor page — this is the fast version of the same conversation, not
// a different feature.
function FloatingAdvisor({ budget }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const ask = async (text) => {
    if (!text.trim() || loading) return;
    const userMessage = text.trim();
    setMessages((m) => [...m, { type: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/claude-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, budget, conversationHistory: messages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'failed');
      setMessages((m) => [...m, { type: 'assistant', content: data.response }]);
    } catch {
      setMessages((m) => [...m, { type: 'assistant', content: "Couldn't reach the advisor just now — try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!budget) return null;

  return (
    <>
      {open && (
        <div className="floating-advisor-sheet" role="dialog" aria-label="Ask the advisor">
          <div className="fa-head">
            <span>💬 Bargain AI</span>
            <div className="fa-head-actions">
              <Link to="/advisor" className="fa-expand" onClick={() => setOpen(false)}>Full chat ↗</Link>
              <button className="fa-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
          </div>

          <div className="fa-body">
            {messages.length === 0 && (
              <div className="fa-empty">
                <p>Ask about your budget — I can see your real numbers.</p>
                <div className="fa-prompts">
                  {QUICK_PROMPTS.map((p) => (
                    <button key={p} onClick={() => ask(p)}>{p}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`fa-msg ${m.type}`}>
                <div className="fa-bubble">
                  {m.type === 'assistant' ? <MiniMarkdown text={m.content} /> : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="fa-msg assistant">
                <div className="fa-bubble fa-typing"><span></span><span></span><span></span></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="fa-input-row" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              disabled={loading}
              aria-label="Message the advisor"
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send">➤</button>
          </form>
        </div>
      )}

      <button
        className={`fa-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close advisor' : 'Ask the advisor'}
      >
        {open ? '×' : '💬'}
      </button>
    </>
  );
}

export default FloatingAdvisor;
