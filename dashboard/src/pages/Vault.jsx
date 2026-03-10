import { useState, useEffect } from 'react';
import { fetchHighlights } from '../lib/api';

export default function Vault() {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVault();
  }, []);

  const loadVault = async () => {
    try {
      setLoading(true);
      const data = await fetchHighlights();
      // Assume API returns { data: [...] } for highlights
      setHighlights(data?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 className="glow-text">Knowledge Vault</h1>
        <div style={{ color: 'var(--text-secondary)' }}>{highlights.length} Saved Items</div>
      </div>
      
      {error && <div style={{ color: '#ff6b6b', marginBottom: '16px' }}>{error}</div>}
      
      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading your neural highlights...</div>
      ) : highlights.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Your vault is empty. Start highlighting articles using the NeuralRead extension.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {highlights.map(h => (
            <div key={h.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <p style={{ flex: 1, marginBottom: '16px', lineHeight: '1.6' }}>"{h.sentence}"</p>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span title={h.url} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                  {h.title || new URL(h.url).hostname}
                </span>
                <span>{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
