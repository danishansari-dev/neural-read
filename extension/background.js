/**
 * Background service worker for NeuralRead extension.
 * This exists to handle events that need to persist independently of web pages,
 * such as keeping track of extension state, or communicating with the backend API.
 */

try {
    // Listen for messages from content scripts or popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // We respond asynchronously so we must return true from the listener
        if (message.type === 'CONTENT_EXTRACTED') {
            console.log('Received extracted content from tab:', sender.tab?.id);

            // TODO: Send data to the backend for TextRank processing and embedding generation
            // We'll wrap this in an async operation once the backend is ready

            sendResponse({ status: 'success', message: 'Content received by background worker' });
        }
        return true;
    });
} catch (error) {
    console.error("Error setting up background service worker:", error);
}
