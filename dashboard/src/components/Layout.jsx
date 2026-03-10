import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Database, Network, Settings as SettingsIcon, LogOut } from 'lucide-react';
import classNames from 'classnames';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2 className="glow-text" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={24} /> NeuralRead
        </h2>
        
        <nav style={{ flex: 1 }}>
          <NavLink to="/" className={({ isActive }) => classNames('nav-link', { active: isActive })}>
            <Database size={20} /> Vault
          </NavLink>
          <NavLink to="/graph" className={({ isActive }) => classNames('nav-link', { active: isActive })}>
            <Network size={20} /> Knowledge Graph
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => classNames('nav-link', { active: isActive })}>
            <SettingsIcon size={20} /> Settings
          </NavLink>
        </nav>

        <button onClick={handleLogout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <LogOut size={18} /> Sign Out
        </button>
      </aside>
      
      <main className="main-content">
        <div className="glass-panel" style={{ padding: '32px', minHeight: '100%' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
