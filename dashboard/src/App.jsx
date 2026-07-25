// NeuralRead v1.0.0 — Production 🚀
// CI Trigger - Redeploy with Railway URL
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Vault from './pages/Vault';
import Graph from './pages/Graph';
import Settings from './pages/Settings';
import Login from './pages/Login';
import HealthCheck from './components/HealthCheck';

/**
 * Main application component that handles routing and global authentication state.
 * It is modified to automatically log in the test user for a passwordless dev experience.
 * @returns React Router layout and application routes
 */
function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Grab session on mount — handles page reloads and OAuth redirects
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (!existingSession) {
        // We auto-login with default test credentials because the login page is temporarily disabled.
        // This allows backend DB interactions to proceed with a real session and token.
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: 'neuralread.test@gmail.com',
            password: 'TestPass123!'
          });
          if (error) {
            console.error("Auto sign in failed:", error);
          } else {
            setSession(data.session);
          }
        } catch (e) {
          console.error("Auto sign in exception:", e);
        }
      } else {
        setSession(existingSession);
      }
      setLoading(false);
    }).catch(async (err) => {
      console.error("Auth session error:", err);
      // Attempt auto-login as a fallback to ensure page load works under network issues
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'neuralread.test@gmail.com',
          password: 'TestPass123!'
        });
        if (!error) {
          setSession(data.session);
        }
      } catch (e) {
        console.error("Auth session error auto-signin fallback exception:", e);
      }
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh, OAuth callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Premium-styled loading screen while checking auth state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0c0c0e',
        color: '#ffd166',
        fontFamily: 'monospace',
        fontSize: 14,
        gap: '8px'
      }}>
        ⬡ Loading NeuralRead...
      </div>
    );
  }

  return (
    <Router>
      <HealthCheck />
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/vault" />} />

        {/* Protected routes — redirect to login if no session */}
        <Route path="/" element={session ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/vault" />} />
          <Route path="vault" element={<Vault />} />
          <Route path="graph" element={<Graph />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;