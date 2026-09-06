import React, { useState } from 'react';
import './App.css';
import Questionnaire from './components/Questionnaire';
import Results from './components/Results';
import AIAdvisor from './components/AIAdvisor';

function App() {
  const [currentPage, setCurrentPage] = useState('questionnaire');
  const [userBudget, setUserBudget] = useState(null);

  const handleQuestionnaireSubmit = (budget) => {
    setUserBudget(budget);
    setCurrentPage('results');
  };

  const handleAskAdvisor = () => {
    setCurrentPage('advisor');
  };

  const handleBackToResults = () => {
    setCurrentPage('results');
  };

  const handleStartOver = () => {
    setUserBudget(null);
    setCurrentPage('questionnaire');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>💰 Budget AI Advisor</h1>
        <p>Personalized budgeting powered by AI</p>
      </header>

      <main className="App-main">
        {currentPage === 'questionnaire' && (
          <Questionnaire onSubmit={handleQuestionnaireSubmit} />
        )}

        {currentPage === 'results' && userBudget && (
          <Results 
            budget={userBudget} 
            onAskAdvisor={handleAskAdvisor}
            onStartOver={handleStartOver}
          />
        )}

        {currentPage === 'advisor' && userBudget && (
          <AIAdvisor 
            budget={userBudget}
            onBack={handleBackToResults}
          />
        )}
      </main>

      <footer className="App-footer">
        <p>Your budget, intelligently personalized</p>
      </footer>
    </div>
  );
}

export default App;
