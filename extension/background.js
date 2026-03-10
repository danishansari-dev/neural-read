/**
 * Background service worker for NeuralRead extension.
 * Handles NLP extraction via backend API and session token storage from dashboard OAuth.
 *
 * Uses importScripts to load config.js — the only way to share code
 * with a non-module service worker in MV3.
 */
importScripts('config.js');

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

/** Dashboard URL pattern to watch for — matches the Vite dev server */
const DASHBOARD_PATTERN = 'http://localhost:5173';

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only act when a dashboard tab finishes loading
    if (changeInfo.status !== 'complete') return;
    if (!tab.url || !tab.url.startsWith(DASHBOARD_PATTERN)) return;

    // Small delay to let Vault.jsx's useEffect run and write to localStorage
    setTimeout(() => {
        chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                // This runs in the context of the dashboard page
                return {
                    token: localStorage.getItem('nr_token'),
                    email: localStorage.getItem('nr_user_email')
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
            }
        }).catch(err => {
            // Silently ignore — tab may have navigated away or been closed
            console.warn('NeuralRead: Could not read dashboard token:', err.message);
        });
    }, 1500);
});
