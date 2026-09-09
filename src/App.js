import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import './styles/App.css';
import Landing from './components/Landing';
import SignIn from './components/SignIn';
import Privacy from './components/Privacy';
import Terms from './components/Terms';
import ComprehensiveQuestionnaire from './components/ComprehensiveQuestionnaire';
import Dashboard from './components/Dashboard';
import SmartSpending from './components/SmartSpending';
import BankConnect from './components/BankConnect';
import AIAdvisor from './components/AIAdvisor';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { saveBudget, loadLatestBudget } from './lib/budgetStore';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'My budget' },
  { to: '/deals', icon: '🥗', label: 'Cheap food & deals' },
  { to: '/bank', icon: '🏦', label: 'Connect bank' },
  { to: '/advisor', icon: '💬', label: 'Ask advisor' },
];

function Shell({ session, budget, children, showNav }) {
  const navigate = useNavigate();
  const username = session?.user?.email?.split('@')[0];

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <>
      <header className="App-header">
        <h1>💰 Budget AI</h1>
        <div className="header-user">
          <span>@{username}</span>
          <button className="btn-logout" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {budget && showNav && (
        <nav className="App-nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <main className="App-main">{children}</main>

      <footer className="App-footer">
        <NavLink to="/privacy">Privacy</NavLink>
        <span aria-hidden="true"> · </span>
        <NavLink to="/terms">Terms</NavLink>
      </footer>
    </>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [userBudget, setUserBudget] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) setUserBudget(await loadLatestBudget());
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUserBudget(newSession ? await loadLatestBudget() : null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="App"><div className="app-loading">Loading…</div></div>;
  }

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/" element={<PublicHome session={session} budget={userBudget} />} />
          <Route path="/signin" element={<AuthRoute session={session} />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          <Route
            path="/setup"
            element={
              <Protected session={session}>
                <Shell session={session} budget={userBudget} showNav={false}>
                  <SetupRoute onSaved={setUserBudget} />
                </Shell>
              </Protected>
            }
          />

          <Route
            path="/dashboard"
            element={
              <Protected session={session}>
                <NeedsBudget budget={userBudget}>
                  <Shell session={session} budget={userBudget} showNav>
                    <Dashboard budget={userBudget} onStartOver={() => setUserBudget(null)} />
                  </Shell>
                </NeedsBudget>
              </Protected>
            }
          />

          <Route
            path="/deals"
            element={
              <Protected session={session}>
                <NeedsBudget budget={userBudget}>
                  <Shell session={session} budget={userBudget} showNav>
                    <SmartSpending budgetRemaining={userBudget?.surplus ?? 0} />
                  </Shell>
                </NeedsBudget>
              </Protected>
            }
          />

          <Route
            path="/bank"
            element={
              <Protected session={session}>
                <NeedsBudget budget={userBudget}>
                  <Shell session={session} budget={userBudget} showNav>
                    <BankConnect budget={userBudget} />
                  </Shell>
                </NeedsBudget>
              </Protected>
            }
          />

          <Route
            path="/advisor"
            element={
              <Protected session={session}>
                <NeedsBudget budget={userBudget}>
                  <Shell session={session} budget={userBudget} showNav>
                    <AIAdvisor budget={userBudget} />
                  </Shell>
                </NeedsBudget>
              </Protected>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

// Signed-out visitors get the landing page; signed-in ones go to their budget.
function PublicHome({ session, budget }) {
  const navigate = useNavigate();
  if (session) return <Navigate to={budget ? '/dashboard' : '/setup'} replace />;
  return <Landing onGetStarted={() => navigate('/signin')} />;
}

function AuthRoute({ session }) {
  const navigate = useNavigate();
  if (session) return <Navigate to="/dashboard" replace />;
  return <SignIn onBack={() => navigate('/')} />;
}

// Sends you back where you were trying to go once you have signed in.
function Protected({ session, children }) {
  const location = useLocation();
  if (!session) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  return children;
}

function NeedsBudget({ budget, children }) {
  if (!budget) return <Navigate to="/setup" replace />;
  return children;
}

function SetupRoute({ onSaved }) {
  const navigate = useNavigate();
  return (
    <ComprehensiveQuestionnaire
      onSubmit={async (budget, answers) => {
        onSaved(budget);
        navigate('/dashboard');
        await saveBudget(budget, answers);
      }}
    />
  );
}

function NotFound() {
  return (
    <main className="App-main not-found">
      <h2>Page not found</h2>
      <p>That link does not go anywhere.</p>
      <a className="btn-cta" href="/">Back to the start</a>
    </main>
  );
}

export default App;
