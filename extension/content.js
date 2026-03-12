/**
 * Content script injected into webpages.
 * This exists to read the DOM, extract the main article text, and apply highlights
 * without requiring the user to manually trigger anything.
 */

/**
 * Safe wrapper around chrome.runtime.sendMessage to gracefully handle context invalidation.
 */
function safeSendMessage(message, callback) {
    try {
        if (!chrome.runtime?.id) {
            console.warn('NeuralRead: Extension context reloaded. Refresh page.');
            return;
        }
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                if (chrome.runtime.lastError.message.includes('Extension context invalidated')) return;
            }
            if (callback) callback(response);
        });
    } catch (e) {
        console.warn('NeuralRead: Context lost.');
    }
}

/**
 * Extracts the main article text from the current page.
 */
function extractArticleText() {
    try {
        let paragraphs = document.querySelectorAll('p');
        let extractedText = '';

        if (paragraphs.length < 3) {
            const articleSelectors = [
                'article p', 'main p', '.mw-parser-output p', '[class*="article"] p', 
                '[class*="content"] p', '[class*="body"] p', '.entry-content p'
            ];
            for (const selector of articleSelectors) {
                const found = document.querySelectorAll(selector);
                if (found.length >= 3) {
                    paragraphs = found;
                    break;
                }
            }
        }

        paragraphs.forEach(p => {
            const text = p.textContent.trim();
            if (text.length > 30) {
                extractedText += text + '\n\n';
            }
        });

        return extractedText;
    } catch (error) {
        console.error('Failed to extract article text:', error);
        return '';
    }
}

/**
 * Extracts article metadata for the NLP engine.
 */
function extractPageMetadata() {
    try {
        const text = document.body.innerText || '';
        return {
            word_count: text.split(/\s+/).length,
            paragraph_count: document.querySelectorAll('p').length,
            heading_count: document.querySelectorAll('h1, h2, h3').length,
            lang: document.documentElement.lang || 'en'
        };
    } catch (e) {
        return { word_count: 0, paragraph_count: 0, heading_count: 0, lang: 'en' };
    }
}

/**
 * Renders highlights on the page, preserving importance tiers.
 */
function renderHighlights(highlights) {
    // Clear existing
    document.querySelectorAll('.nr-highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.innerText), el);
        parent.normalize();
    });

    highlights.forEach(h => {
        const sentence = typeof h === 'string' ? h : h.sentence;
        const tier = h.importance_tier || 'important';
        applyTieredHighlight(sentence, tier);
    });
}

/**
 * Highlighting with tiered CSS classes.
 */
function applyTieredHighlight(text, tier) {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walk.nextNode()) {
        const parent = node.parentElement;
        if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.classList.contains('nr-highlight')) continue;
        
        const index = node.textContent.indexOf(text);
        if (index !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + text.length);
            
            const span = document.createElement('span');
            span.className = `nr-highlight nr-highlight-${tier}`;
            
            try {
                range.surroundContents(span);
            } catch (e) {
                // Fallback for complex splits
                const content = node.textContent;
                const before = document.createTextNode(content.substring(0, index));
                const after = document.createTextNode(content.substring(index + text.length));
                span.textContent = text;
                parent.insertBefore(before, node);
                parent.insertBefore(span, node);
                parent.insertBefore(after, node);
                parent.removeChild(node);
            }
            break; 
        }
    }
}

/**
 * Local fallback highlights (v2 logic).
 */
function highlightSentencesInDOM(sentences) {
    sentences.forEach(s => applyTieredHighlight(s, 'important'));
    return sentences.length;
}

/**
 * Injects or updates a floating badge.
 */
function injectOrUpdateBadge(text, isFallback = false) {
    let badge = document.querySelector('.nr-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'nr-badge';
        document.body.appendChild(badge);
    }
    
    if (text === '...') {
        badge.textContent = '✦ Analyzing...';
        badge.style.opacity = '0.7';
    } else if (text === '!') {
        badge.textContent = '✦ Error';
        badge.style.color = '#ff6b6b';
        badge.style.borderColor = '#ff6b6b';
    } else {
        badge.textContent = `✦ ${text} highlights${isFallback ? ' (local)' : ''}`;
        badge.style.opacity = '1';
    }
}

/**
 * Local scoring fallback.
 */
function fallbackLocalScoring(text) {
    const sentences = text.split('. ').filter(s => s.length > 20).slice(0, 3);
    const count = highlightSentencesInDOM(sentences);
    injectOrUpdateBadge(count, true);
}

// Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'RENDER_HIGHLIGHTS') {
        const highlights = request.payload.highlights || [];
        renderHighlights(highlights);
        injectOrUpdateBadge(highlights.length);
    } else if (request.action === 'EXTRACT_PAGE_METADATA') {
        const metadata = extractPageMetadata();
        sendResponse({ metadata });
    }
    return true;
});

/**
 * Main execution.
 */
async function initialize() {
    const hostname = window.location.hostname;
    const EXCLUDED_HOSTS = ['localhost', '127.0.0.1', 'neural-read-dashboard.vercel.app'];
    
    if (EXCLUDED_HOSTS.some(h => hostname.includes(h))) {
        // Bug 3: Logout sync on dashboard
        if (hostname === 'neural-read-dashboard.vercel.app') {
            window.addEventListener('storage', (e) => {
                if (e.key && e.key.includes('sb-') && e.key.endsWith('-auth-token') && !e.newValue) {
                    chrome.runtime.sendMessage({ action: 'LOGOUT' });
                }
            });
        }
        return;
    }

    if (window.location.protocol.startsWith('chrome')) return;

    try {
        if (!chrome?.storage?.local) return;

        const { nr_enabled } = await chrome.storage.local.get(['nr_enabled']);
        if (nr_enabled === false) return;

        const text = extractArticleText();
        if (!text) return;

        injectOrUpdateBadge('...');

        safeSendMessage({ 
            type: 'EXTRACT', 
            payload: { 
                text: text,
                url: window.location.href,
                title: document.title,
                metadata: extractPageMetadata()
            } 
        }, (response) => {
            if (chrome.runtime.lastError || !response || response.status === 'error') {
                fallbackLocalScoring(text);
            }
        });
    } catch (error) {
        console.error("NeuralRead init error:", error);
    }
}

/**
 * Initialization with retry for JS pages.
 */
async function initializeWithRetry(retryCount = 0) {
    if (!chrome?.storage?.local) return;
    
    const hostname = window.location.hostname;
    const EXCLUDED_HOSTS = ['localhost', '127.0.0.1', 'neural-read-dashboard.vercel.app'];
    if (EXCLUDED_HOSTS.some(h => hostname.includes(h))) {
        await initialize();
        return;
    }

    const NON_ARTICLE_HOSTS = ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com', 'mail.google.com'];
    if (NON_ARTICLE_HOSTS.some(h => hostname.includes(h))) return;

    const text = extractArticleText();
    if (!text && retryCount < 3) {
        setTimeout(() => initializeWithRetry(retryCount + 1), 2000);
        return;
    }

    if (!text) return;
    await initialize();
}

// Entry Point
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initializeWithRetry, 1000));
} else {
    setTimeout(initializeWithRetry, 1500);
}
