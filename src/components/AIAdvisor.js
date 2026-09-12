import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AIAdvisor.css';

function AIAdvisor({ budget }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      content: `Hi! I'm the Bargainly advisor. I've analyzed your ${budget.country} budget and I'm ready to help you optimize it. What would you like to know about?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = input;
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      // Call Claude API
      const response = await fetch('/api/claude-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          budget: budget,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from advisor');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { type: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: "Sorry, I couldn't process that. Please try again or ask a different question.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="advisor-container">
      <div className="advisor-header">
        <h2>💬 AI Budget Advisor</h2>
        <p>Ask me anything about optimizing your {budget.country} budget</p>
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Back to dashboard</button>
      </div>

      {/* Quick Questions */}
      <div className="quick-questions">
        <p>Quick questions:</p>
        <div className="question-buttons">
          <button onClick={() => handleQuickQuestion('How can I save more money each month?')}>
            💰 Save more
          </button>
          <button onClick={() => handleQuickQuestion('Which expenses can I reduce?')}>
            ✂️ Reduce costs
          </button>
          <button onClick={() => handleQuickQuestion('Is my budget healthy?')}>
            📊 Budget health
          </button>
          <button onClick={() => handleQuickQuestion('What are local deals or discounts I should know about?')}>
            🎯 Local deals
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.type}`}>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-content typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your budget..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? '⏳' : '📤'}
        </button>
      </form>
    </div>
  );
}

export default AIAdvisor;
