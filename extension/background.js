/**
 * Background service worker for NeuralRead extension.
 */
import { BACKEND_URL, TOKEN_KEY, MAX_HIGHLIGHTS } from './config.js';

try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'EXTRACT') {
            console.log('Extract request from tab:', sender.tab?.id);
            
            // Handle async fetch inside the listener
            (async () => {
                try {
                    // Try to get auth token
                    const { [TOKEN_KEY]: token } = await chrome.storage.local.get([TOKEN_KEY]);
                    const headers = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    const res = await fetch(`${BACKEND_URL}/api/v1/extract`, {
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
                        .slice(0, MAX_HIGHLIGHTS);

                    // If authenticated, save highlights to DB asynchronously
                    if (token) {
                        fetch(`${BACKEND_URL}/api/v1/save`, {
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
    });
} catch (error) {
    console.error("Error setting up background worker:", error);
}
