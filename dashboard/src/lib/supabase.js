import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'placeholder_url';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Initiates Google OAuth sign-in via Supabase.
 * Redirects the user to Google consent screen, then back to /vault.
 * @returns {Promise} Supabase OAuth response
 */
export const signInWithGoogle = async () => {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://neural-read-dashboard.vercel.app/vault'
    }
  });
};

/**
 * Subscribes to auth state changes (login, logout, token refresh).
 * @param {Function} callback - Called with (event, session) on every change
 * @returns {Object} Subscription object with unsubscribe method
 */
export const onAuthChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};
