import React, { useState, useEffect } from 'react';
import './styles/App.css';
import Auth from './components/Auth';
import ComprehensiveQuestionnaire from './components/ComprehensiveQuestionnaire';
import Dashboard from './components/Dashboard';
import SmartSpending from './components/SmartSpending';
import BankConnect from './components/BankConnect';
import AIAdvisor from './components/AIAdvisor';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('auth');
  const [userBudget, setUserBudget] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('budgetUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setCurrentPage('questionnaire');
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentPage('questionnaire');
  };

  const handleQuestionnaireSubmit = (budget) => {
    setUserBudget(budget);
    setCurrentPage('dashboard');
  };

  const handleAskAdvisor = () => {
    setCurrentPage('advisor');
  };

  const handleBackToResults = () => {
    setCurrentPage('dashboard');
  };

  const handleStartOver = () => {
    setUserBudget(null);
    setCurrentPage('questionnaire');
  };

  const handleLogout = () => {
    localStorage.removeItem('budgetUser');
    localStorage.removeItem('expenses');
    setCurrentUser(null);
    setUserBudget(null);
    setCurrentPage('auth');
  };

  const handleGoToSmartSpending = () => {
    setCurrentPage('smartspending');
  };

  const handleGoToBank = () => {
    setCurrentPage('bank');
  };

  return (
    <div className="App">
      {currentPage === 'auth' && <Auth onLogin={handleLogin} />}

      {currentPage !== 'auth' && (
        <>
          <header className="App-header">
            <h1>💰 Budget AI Advisor</h1>
            <div className="header-user">
              <span>@{currentUser?.username}</span>
              <button className="btn-logout" onClick={handleLogout}>Logout</button>
            </div>
          </header>

          <main className="App-main">
            {currentPage === 'questionnaire' && (
              <ComprehensiveQuestionnaire onSubmit={handleQuestionnaireSubmit} />
            )}

            {currentPage === 'dashboard' && userBudget && (
              <Dashboard 
                budget={userBudget} 
                onAskAdvisor={handleAskAdvisor}
                onStartOver={handleStartOver}
                onGoToSmartSpending={handleGoToSmartSpending}
                onGoToBank={handleGoToBank}
              />
            )}

            {currentPage === 'smartspending' && userBudget && (
              <SmartSpending
                budgetRemaining={userBudget.surplus}
                onBack={() => setCurrentPage('dashboard')}
              />
            )}

            {currentPage === 'bank' && (
              <BankConnect onBack={() => setCurrentPage('dashboard')} />
            )}

            {currentPage === 'advisor' && userBudget && (
              <AIAdvisor 
                budget={userBudget}
                onBack={handleBackToResults}
              />
            )}
          </main>

          <footer className="App-footer">
            <p>Smart spending starts here 💪</p>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
