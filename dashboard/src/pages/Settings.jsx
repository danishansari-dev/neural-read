import { useState } from 'react';

export default function Settings() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="glow-text" style={{ marginBottom: '24px' }}>Settings</h1>
      
      <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--accent-primary)' }}>Preferences</h3>
        
        <div className="form-group">
          <label>Algorithm Sensitivity (Extract More vs Quality)</label>
          <input type="range" min="1" max="10" defaultValue="5" style={{ width: '100%', cursor: 'pointer' }} />
        </div>
        
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
          <input type="checkbox" defaultChecked id="autoSave" style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }} />
          <label htmlFor="autoSave" style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Automatically save highlights to Vault</label>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '32px 0' }} />
        
        <div className="form-group">
          <label>Theme</label>
          <select className="input-field" disabled>
            <option>Dark Mode (Default)</option>
            <option>Light Mode</option>
          </select>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>NeuralRead's premium aesthetic is optimized for dark mode.</p>
        </div>

        <button onClick={handleSave} className="btn-primary" style={{ marginTop: '16px' }}>
          {saved ? 'Saved Successfully ✓' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
