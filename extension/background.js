/**
 * Background service worker for NeuralRead extension.
 * Handles NLP extraction via backend API and session token storage from dashboard OAuth.
 *
 * Uses importScripts to load config.js — the only way to share code
 * with a non-module service worker in MV3.
 */
// Inlined config — avoids importScripts MV3 service worker loading issues
const CONFIG = {
  BACKEND_URL: 'https://neural-read-backend-production.up.railway.app',
  DASHBOARD_URL: 'https://neural-read-dashboard-fzl754h8p-danishs-projects-25aab0a7.vercel.app',
  ENABLED_KEY: 'nr_enabled',
  TOKEN_KEY: 'nr_token',
  MAX_HIGHLIGHTS: 3
};

try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Handle NLP extraction requests from content script
        if (message.type === 'EXTRACT') {
            console.log('Extract request from tab:', sender.tab?.id);
            
            // Handle async fetch inside the listener
            (async () => {
                try {
                     // Try to get auth token from chrome.storage
                    const { [CONFIG.TOKEN_KEY]: token } = await chrome.storage.local.get([CONFIG.TOKEN_KEY]);
                    const headers = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const res = await fetch(`${CONFIG.BACKEND_URL}/api/v1/extract`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(message.payload)
                    });

                    if (!res.ok) throw new Error(`API Error: ${res.status}`);
                    
                    const data = await res.json();
                    if (!data.highlights || !Array.isArray(data.highlights)) {
                        throw new Error('Invalid highlight data returned from API');
                    }
                    
                    // Take top elements based on MAX_HIGHLIGHTS setting
                    const sentencesToHighlight = data.highlights
                        .map(h => h.sentence)
                        .slice(0, CONFIG.MAX_HIGHLIGHTS);

                    // If authenticated, save highlights to DB asynchronously
                    if (token) {
                        fetch(`${CONFIG.BACKEND_URL}/api/v1/save`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                url: message.payload.url,
                                title: message.payload.title,
                                highlights: sentencesToHighlight
                            })
                        }).catch(e => console.error("Optional save failure:", e));
                    }

                    sendResponse({ status: 'success', highlights: sentencesToHighlight });
                } catch (err) {
                    console.error("Backend extraction failed:", err);
                    sendResponse({ status: 'error', error: err.message });
                }
            })();
            return true; // Keep channel open for async response
        }

        // Handle token storage from content script after dashboard Google OAuth.
        // Content script detects the token in localStorage on the dashboard page
        // and forwards it here for secure storage in chrome.storage.local.
        if (message.type === 'STORE_TOKEN' && message.token) {
            chrome.storage.local.set({
                [CONFIG.TOKEN_KEY]: message.token,
                user_email: message.email || 'Google User'
            }).then(() => {
                console.log('NeuralRead: token stored from dashboard login');
                sendResponse({ success: true });
            });
            return true; // async response
        }
    });
} catch (error) {
    console.error("Error setting up background worker:", error);
}

// ── Auth token bridge: detect dashboard tab loads and read token from localStorage ──
// Since content scripts are excluded from localhost (to avoid highlighting the dashboard),
// we use chrome.scripting.executeScript to inject a tiny token-reader when the dashboard loads.
// This fires after Google OAuth redirects back to /vault.

/** Dashboard URL pattern to watch for — matches the Vite dev server and Vercel */
const DASHBOARD_PATTERNS = [
  'http://localhost:5173',
  'https://neural-read-dashboard.vercel.app',
  'https://neural-read-dashboard-fzl754h8p-danishs-projects-25aab0a7.vercel.app'
];

/**
 * Attempts to read auth token from a dashboard tab's localStorage.
 * Retries multiple times because Supabase getSession() is async and
 * may not have resolved + written to localStorage immediately on page load.
 * @param {number} tabId - The tab to inject into.
 * @param {number} attempt - Current attempt number (0-indexed).
 */
function tryReadDashboardToken(tabId, attempt = 0) {
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY = 2000; // 2 seconds between attempts

    chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
             // Supabase v2 stores session under this key format
             const projectRef = 'jvonssuacpucoxnwodlp';
             const key = `sb-${projectRef}-auth-token`;
             const raw = localStorage.getItem(key);
             if (!raw) {
               // Try alternative keys
               const allKeys = Object.keys(localStorage);
               const authKey = allKeys.find(k => 
                 k.includes('auth-token') || 
                 k.includes('supabase.auth.token')
               );
               if (!authKey) return null;
               const data = JSON.parse(localStorage.getItem(authKey));
               const session = data?.currentSession || data?.session || data;
               return {
                 token: session?.access_token || null,
                 email: session?.user?.email || null
               };
             }
             const data = JSON.parse(raw);
             const session = data?.currentSession || data?.session || data;
             return {
               token: session?.access_token || null,
               email: session?.user?.email || null
             };
        }
    }).then((results) => {
        const data = results?.[0]?.result;
        if (data?.token) {
            chrome.storage.local.set({
                [CONFIG.TOKEN_KEY]: data.token,
                user_email: data.email || 'Google User'
            }).then(() => {
                console.log('NeuralRead: token captured from dashboard tab');
            });
        } else if (attempt < MAX_ATTEMPTS - 1) {
            // Token not in localStorage yet — Supabase may still be processing
            console.log(`NeuralRead: No token yet, retrying... (${attempt + 1}/${MAX_ATTEMPTS})`);
            setTimeout(() => tryReadDashboardToken(tabId, attempt + 1), RETRY_DELAY);
        } else {
            console.warn('NeuralRead: Could not find token in dashboard after all retries.');
        }
    }).catch(err => {
        // Tab may have navigated away, been closed, or we lack permissions
        console.warn('NeuralRead: Could not read dashboard token:', err.message);
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only act when a dashboard tab finishes loading
    if (changeInfo.status !== 'complete') return;
    if (!tab.url) return;
    const isDashboard = DASHBOARD_PATTERNS.some(p => tab.url.startsWith(p));
    if (!isDashboard) return;

    // Initial delay to let React mount and Vault.jsx useEffect fire
    setTimeout(() => tryReadDashboardToken(tabId), 1500);
});
