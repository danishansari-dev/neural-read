import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Attempt sign-in, and auto-register on failure for simplicity in this demo
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) setError(signUpError.message);
      } else {
        setError(signInError.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <h1 className="glow-text" style={{ marginBottom: '8px' }}>NeuralRead</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Welcome back. Sign in to access your knowledge vault.</p>
        
        {error && <div style={{ color: '#ff6b6b', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In / Register'}
          </button>
        </form>
      </div>
    </div>
  );
}
