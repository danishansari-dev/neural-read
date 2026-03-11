import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Login page with Google OAuth + email/password sign in & sign up.
 * Google OAuth redirects through Supabase; email auth is direct.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  /** Initiates Google OAuth via Supabase — redirects to Google consent screen */
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://neural-read-dashboard-fzl754h8p-danishs-projects-25aab0a7.vercel.app/vault'
      }
    });
    if (error) setError(error.message);
  };

  /** Email + password sign in via Supabase Auth */
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else navigate('/vault');
    setLoading(false);
  };

  /** Email + password sign up — user must confirm via email */
  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + '/vault' }
    });
    if (error) setError(error.message);
    else setMessage('Check your email to confirm your account!');
    setLoading(false);
  };

  /** Inline Google "G" logo SVG for the OAuth button */
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <h1 className="glow-text" style={{ marginBottom: '4px' }}>⬡ NeuralRead</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '0.95rem' }}>
          Your knowledge graph awaits
        </p>

        {/* Google OAuth — primary action */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            background: '#ffffff',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            marginBottom: '28px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '28px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
          <span style={{ 
            position: 'absolute', 
            top: '-10px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            background: 'var(--bg-glass)',
            padding: '0 12px',
            color: 'var(--text-tertiary)',
            fontSize: '0.85rem'
          }}>or manual sign in</span>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '16px', color: '#ff6b6b', fontSize: '0.9rem', background: 'rgba(255,107,107,0.1)', padding: '10px', borderRadius: '6px' }}>{error}</div>}
        {message && <div className="success-message" style={{ marginBottom: '16px', color: '#4ade80', fontSize: '0.9rem', background: 'rgba(74,222,128,0.1)', padding: '10px', borderRadius: '6px' }}>{message}</div>}

        {/* Email Auth Form */}
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 16px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '15px'
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 16px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '15px'
            }}
          />
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: 'var(--accent-glow)',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 600,
                flex: 1,
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
            <button 
              type="button" 
              onClick={handleSignUp}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 600,
                flex: 1,
                cursor: 'pointer'
              }}
            >
              Wait, Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
