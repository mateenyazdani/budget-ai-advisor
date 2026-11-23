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
import TopBar from './components/TopBar';
import WorldMap from './components/WorldMap';
import Feed from './components/Feed';
import FloatingAdvisor from './components/FloatingAdvisor';
import Friends from './components/Friends';
import Profile from './components/Profile';
import Landing from './components/Landing';
import SignIn from './components/SignIn';
import Privacy from './components/Privacy';
import SampleBudget from './components/SampleBudget';
import Terms from './components/Terms';
import ComprehensiveQuestionnaire from './components/ComprehensiveQuestionnaire';
import Dashboard from './components/Dashboard';
import Discover from './components/Discover';
import BankConnect from './components/BankConnect';
import AIAdvisor from './components/AIAdvisor';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { saveBudget, loadLatestBudget } from './lib/budgetStore';
import { getStoredTheme, applyTheme } from './lib/theme';
import { getInsights } from './utils/insights';

function Shell({ session, budget, children, showNav }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getStoredTheme);
  const insight = budget ? getInsights(budget) : null;

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/');
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  return (
    <>
      <TopBar
        session={session}
        budget={budget}
        insight={insight}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
        showTabs={showNav}
      />

      <main className="App-main">{children}</main>

      <footer className="App-footer">
        <NavLink to="/privacy">Privacy</NavLink>
        <span aria-hidden="true"> · </span>
        <NavLink to="/terms">Terms</NavLink>
      </footer>

      {/* Reachable from anywhere in the main app, not just its own page.
          Needs a real budget to say anything useful about, so it stays
          silent on the setup/edit flow (showNav is already off there). */}
      {showNav && budget && <FloatingAdvisor budget={budget} />}
    </>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [userBudget, setUserBudget] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // Applied once at the root so a remembered preference holds on every
  // route, including the public landing page, which has no Shell header of
  // its own to carry a toggle.
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

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
          <Route path="/sample" element={<SampleBudget />} />
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
            path="/edit"
            element={
              <Protected session={session}>
                <NeedsBudget budget={userBudget}>
                  <Shell session={session} budget={userBudget} showNav={false}>
                    <SetupRoute onSaved={setUserBudget} initial={userBudget?.answers} />
                  </Shell>
                </NeedsBudget>
              </Protected>
            }
          />

          <Route
            path="/dashboard"
            element={
              <Protected session={session}>
                <NeedsBudget budget={userBudget}>
                  <Shell session={session} budget={userBudget} showNav>
                    <Dashboard
                      budget={userBudget}
                      onStartOver={() => setUserBudget(null)}
                      onBudgetChange={(next, answers) => {
                        setUserBudget(next);
                        saveBudget(next, answers);
                      }}
                    />
                  </Shell>
                </NeedsBudget>
              </Protected>
            }
          />

          <Route
            path="/discover"
            element={
              <Shell session={session} budget={userBudget} showNav>
                <Discover budgetRemaining={userBudget?.surplus} budget={userBudget} session={session} />
              </Shell>
            }
          />

          {/* The map reads as an invitation when signed out rather than a
              redirect to a sign-in wall, so it is not wrapped in Protected. */}
          <Route
            path="/map"
            element={
              <Shell session={session} budget={userBudget} showNav>
                <WorldMap session={session} />
              </Shell>
            }
          />

          <Route
            path="/feed"
            element={
              <Protected session={session}>
                <Shell session={session} budget={userBudget} showNav>
                  <Feed session={session} budget={userBudget} />
                </Shell>
              </Protected>
            }
          />

          <Route
            path="/friends"
            element={
              <Protected session={session}>
                <Shell session={session} budget={userBudget} showNav>
                  <Friends session={session} />
                </Shell>
              </Protected>
            }
          />

          <Route
            path="/profile"
            element={
              <Protected session={session}>
                <Shell session={session} budget={userBudget} showNav>
                  <Profile session={session} />
                </Shell>
              </Protected>
            }
          />

          <Route path="/deals" element={<Navigate to="/discover" replace />} />

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

// Signed-out visitors get the landing page; signed-in ones go straight to
// what changed while they were away.
function PublicHome({ session, budget }) {
  const navigate = useNavigate();
  if (session) return <Navigate to="/feed" replace />;
  return <Landing onGetStarted={() => navigate('/signin')} />;
}

function AuthRoute({ session }) {
  const navigate = useNavigate();
  if (session) return <Navigate to="/feed" replace />;
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

function SetupRoute({ onSaved, initial }) {
  const navigate = useNavigate();
  return (
    <ComprehensiveQuestionnaire
      initial={initial}
      onCancel={() => navigate('/dashboard')}
      onSubmit={async (budget, answers) => {
        onSaved({ ...budget, answers });
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

