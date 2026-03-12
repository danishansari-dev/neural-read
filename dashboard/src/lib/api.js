import { supabase } from './supabase';

export const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'https://neural-read-backend-production.up.railway.app'}/api/v1`;

/**
 * Fetches all highlights connected to the authenticated user from the backend API.
 */
export async function fetchHighlights() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}/highlights`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!res.ok) throw new Error('Failed to fetch highlights');
  return res.json();
}
