import { useState, useEffect } from 'react';
import { fetchHighlights } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function Vault() {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVault();

    // After Google OAuth redirect, store the session token in localStorage
    // so the extension's background.js can pick it up via chrome.scripting.executeScript
    const sendTokenToExtension = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        localStorage.setItem('nr_token', session.access_token);
        localStorage.setItem('nr_user_email', session.user?.email || 'Google User');
      }
    };
    sendTokenToExtension();
  }, []);

  const loadVault = async () => {
    try {
      setLoading(true);
      const data = await fetchHighlights();
      if (data) {
        // API returns array directly, not wrapped in {data: [...]}
        setHighlights(Array.isArray(data) ? data : (data?.data || []));
      }
    } catch (err) {
      console.error('Failed to load vault:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Deletes a single highlight from the knowledge vault.
   * @param {string} id - Highlight UUID
   */
  const deleteHighlight = async (id) => {
    try {
      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setHighlights(highlights.filter(h => h.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete highlight');
    }
  };

  if (loading) return <div className="vault-loading">Loading your vault...</div>;
  if (error) return <div className="vault-error">Error: {error}</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Knowledge Vault</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Your extracted insights across the web.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 'bold' }}>{highlights.length} Insights</p>
        </div>
      </header>

      {highlights.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 0', border: '2px dashed var(--bg-hover)', borderRadius: '12px' }}>
          <p>Your vault is empty. Start highlighting articles with the NeuralRead extension!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {highlights.map(h => (
            <div key={h.id} style={{ 
              background: 'var(--bg-card)', 
              borderRadius: '12px', 
              padding: '24px', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              border: '1px solid var(--bg-hover)'
            }}>
              <p style={{ flex: 1, marginBottom: '16px', lineHeight: '1.6' }}>
                "{h.sentence}"
              </p>
              <div style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)', 
                display: 'flex', 
                justifyContent: 'space-between' 
              }}>
                <span 
                  title={h.source_url} 
                  style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    maxWidth: '200px' 
                  }}
                >
                  {h.source_title || (() => { 
                    try { return new URL(h.source_url).hostname; } 
                    catch { return h.source_url || 'Unknown source'; } 
                  })()}
                </span>
                <span>{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
              <button 
                onClick={() => deleteHighlight(h.id)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#ff5252',
                  cursor: 'pointer',
                  opacity: 0.6
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
