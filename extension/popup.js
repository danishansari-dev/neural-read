/**
 * Popup script for NeuralRead extension.
 * Handles toggle state, Google OAuth (opens dashboard), and email auth.
 */
import { BACKEND_URL, ENABLED_KEY, TOKEN_KEY } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('enabled-toggle');
  const authView = document.getElementById('auth-view');
  const connectedView = document.getElementById('connected-view');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');
  const googleBtn = document.getElementById('google-btn');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorMsg = document.getElementById('error-msg');
  const userEmailDisplay = document.getElementById('user-email');

  // Load toggle state
  const { [ENABLED_KEY]: isEnabled = true } = await chrome.storage.local.get(ENABLED_KEY);
  toggle.checked = isEnabled;

  toggle.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ [ENABLED_KEY]: e.target.checked });
  });

  /**
   * Checks chrome.storage for an existing auth token and updates the UI.
   * Shows connected-view if token exists, auth-view otherwise.
   */
  const checkAuth = async () => {
    const { [TOKEN_KEY]: token, user_email: email } = await chrome.storage.local.get([TOKEN_KEY, 'user_email']);
    if (token && email) {
      authView.style.display = 'none';
      connectedView.style.display = 'block';
      userEmailDisplay.textContent = email;
    } else {
      authView.style.display = 'block';
      connectedView.style.display = 'none';
    }
  };

  await checkAuth();

  // Google button opens the dashboard login page in a new tab
  // The actual OAuth flow happens in the dashboard, which then
  // sends the session token back to the extension via postMessage
  googleBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/login' });
  });

  // Email/password sign-in via backend API
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    const email = emailInput.value;
    const password = passwordInput.value;
    const btn = document.getElementById('login-btn');
    btn.textContent = 'Authenticating...';
    btn.disabled = true;

    try {
      // Direct call to FastAPI backend auth login route
      // Must match auth.py LoginRequest: JSON body with {email, password}
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Authentication failed');
      }

      const data = await res.json();
      // Store token and email in chrome.storage for background.js to use
      await chrome.storage.local.set({ 
        [TOKEN_KEY]: data.access_token,
        user_email: email 
      });
      await checkAuth();

    } catch (err) {
      errorMsg.textContent = err.message;
    } finally {
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove([TOKEN_KEY, 'user_email']);
    emailInput.value = '';
    passwordInput.value = '';
    await checkAuth();
  });
});
