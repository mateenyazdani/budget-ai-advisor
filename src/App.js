import React, { useState, useEffect } from 'react';
import './styles/App.css';
import Landing from './components/Landing';
import SignIn from './components/SignIn';
import ComprehensiveQuestionnaire from './components/ComprehensiveQuestionnaire';
import Dashboard from './components/Dashboard';
import SmartSpending from './components/SmartSpending';
import BankConnect from './components/BankConnect';
import AIAdvisor from './components/AIAdvisor';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { saveBudget, loadLatestBudget } from './lib/budgetStore';

const NAV_ITEMS = [
  { page: 'dashboard', icon: '📊', label: 'My budget' },
  { page: 'smartspending', icon: '🥗', label: 'Cheap food & deals' },
  { page: 'bank', icon: '🏦', label: 'Connect bank' },
  { page: 'advisor', icon: '💬', label: 'Ask advisor' },
];

function App() {
  const [session, setSession] = useState(null);
  const [currentPage, setCurrentPage] = useState('landing');
  const [userBudget, setUserBudget] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // Restore the session, then the saved budget, so returning lands you on your
  // dashboard rather than back at the questionnaire.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        const saved = await loadLatestBudget();
        if (!active) return;
        if (saved) {
          setUserBudget(saved);
          setCurrentPage('dashboard');
        } else {
          setCurrentPage('questionnaire');
        }
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setUserBudget(null);
        setCurrentPage('landing');
        return;
      }
      const saved = await loadLatestBudget();
      setUserBudget(saved);
      setCurrentPage(saved ? 'dashboard' : 'questionnaire');
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleQuestionnaireSubmit = async (budget, answers) => {
    setUserBudget(budget);
    setCurrentPage('dashboard');
    await saveBudget(budget, answers);
  };

  const handleStartOver = () => {
    setUserBudget(null);
    setCurrentPage('questionnaire');
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setUserBudget(null);
    setCurrentPage('landing');
  };

  const username = session?.user?.email?.split('@')[0];

  if (loading) {
    return (
      <div className="App">
        <div className="app-loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="App">
      {!session && currentPage === 'landing' && (
        <Landing onGetStarted={() => setCurrentPage('signin')} />
      )}

      {!session && currentPage === 'signin' && (
        <SignIn onBack={() => setCurrentPage('landing')} />
      )}

      {session && (
        <>
          <header className="App-header">
            <h1>💰 Budget AI</h1>
            <div className="header-user">
              <span>@{username}</span>
              <button className="btn-logout" onClick={handleLogout}>Sign out</button>
            </div>
          </header>

          {userBudget && currentPage !== 'questionnaire' && (
            <nav className="App-nav" aria-label="Main">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.page}
                  className={currentPage === item.page ? 'active' : ''}
                  aria-current={currentPage === item.page ? 'page' : undefined}
                  onClick={() => setCurrentPage(item.page)}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              ))}
            </nav>
          )}

          <main className="App-main">
            {currentPage === 'questionnaire' && (
              <ComprehensiveQuestionnaire onSubmit={handleQuestionnaireSubmit} />
            )}

            {currentPage === 'dashboard' && userBudget && (
              <Dashboard
                budget={userBudget}
                onAskAdvisor={() => setCurrentPage('advisor')}
                onStartOver={handleStartOver}
                onGoToSmartSpending={() => setCurrentPage('smartspending')}
                onGoToBank={() => setCurrentPage('bank')}
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
                onBack={() => setCurrentPage('dashboard')}
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
