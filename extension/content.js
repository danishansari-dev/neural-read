/**
 * Content script injected into webpages.
 * This exists to read the DOM, extract the main article text, and apply highlights
 * without requiring the user to manually trigger anything.
 *
 * CONFIG global is loaded from config.js via manifest.json content_scripts injection.
 */

/**
 * Safe wrapper around chrome.runtime.sendMessage to gracefully handle
 * "Extension context invalidated" errors that occur when the extension
 * is reloaded while a tab's content script is still running.
 * @param {object} message - The message payload to send.
 * @param {Function} [callback] - Optional callback for the response.
 */
function safeSendMessage(message, callback) {
    try {
        // Quick check: if runtime.id is gone, the extension context is already dead
        if (!chrome.runtime?.id) {
            console.warn('NeuralRead: Extension reloaded. Refresh page to re-activate.');
            return;
        }
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                const err = chrome.runtime.lastError.message;
                if (err.includes('Extension context invalidated') ||
                    err.includes('Could not establish connection')) {
                    console.warn('NeuralRead: Context lost, ignoring.');
                    return;
                }
            }
            if (callback) callback(response);
        });
    } catch (e) {
        if (e.message?.includes('Extension context invalidated')) {
            console.warn('NeuralRead: Context invalidated, ignoring.');
        } else {
            console.error('NeuralRead sendMessage error:', e);
        }
    }
}

/**
 * Extracts the main article text from the current page.
 * Uses a simple paragraph scraper with fallback selectors for sites
 * like Britannica and Wikipedia that use non-standard layouts.
 * @returns {string} The extracted text content, joined by newlines.
 */
function extractArticleText() {
    try {
        let paragraphs = document.querySelectorAll('p');
        let extractedText = '';

        // If few paragraphs found, try article-specific selectors
        // to handle JS-heavy sites (Britannica, Wikipedia, news sites)
        if (paragraphs.length < 3) {
            const articleSelectors = [
                'article p',
                '[class*="article"] p',
                '[class*="content"] p',
                '[class*="body"] p',
                'main p',
                '.mw-parser-output p',       // Wikipedia
                '[class*="ArticleBody"] p',  // Britannica
                '[class*="article-body"] p',
                '[data-testid*="article"] p',
                '[class*="course"] p',
                '[class*="Course"] p',
                '[class*="lesson"] p',
                '[class*="tutorial"] p',
                '[class*="post"] p',
                '[class*="blog"] p',
                '[class*="container"] p',
                '.entry-content p',
                '[class*="description"] p',
                '[class*="hero"] p',
                '[class*="about"] p',
                'section p',
                'div[class*="content"] p',
                'div[class*="description"] p',
                'h1',
                'h2',
                'h3'
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
            // Ignore very short paragraphs which are often metadata, UI elements, or copyright notices
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
 * Splits extracted article text into an array of sentences.
 * @param {string} text - The full extracted text.
 * @returns {string[]} Array of sentences longer than 20 characters.
 */
function splitIntoSentences(text) {
    // We split on '. ' because it's a simple heuristic for sentence boundaries
    // that avoids splitting on decimal numbers or acronyms like 'e.g.' (mostly).
    if (!text) return [];

    // Replace newlines with spaces to avoid broken sentences across paragraphs
    const cleanText = text.replace(/\n+/g, ' ');

    return cleanText.split('. ')
        .map(s => s.trim())
        // Filter out very short snippets which are unlikely to be meaningful sentences
        .filter(s => s.length >= 20);
}

/**
 * Scores a sentence based on length, presence of numbers, and keyword density.
 * @param {string} sentence - The sentence to score.
 * @returns {number} The calculated score.
 */
function scoreSentence(sentence) {
    // We want to highlight substantial, informative sentences.
    // Optimal length, stats, and dense vocabulary usually indicate important facts.
    let score = 0;

    // Prefer sentences between 100 and 200 characters (typical length of a strong thesis or fact)
    if (sentence.length >= 100 && sentence.length <= 200) {
        score += 3;
    } else if (sentence.length > 50 && sentence.length < 300) {
        score += 1;
    }

    // Presence of numbers often indicates statistics, dates, or concrete facts
    if (/\d+/.test(sentence)) {
        score += 2;
    }

    // Calculate keyword density by excluding common stop words
    // Tricky logic: using a simplified set of stop words to keep the regex fast and lightweight
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'in', 'of', 'that', 'it', 'for', 'with', 'as', 'by', 'an', 'be', 'this', 'was', 'are', 'or', 'from', 'but', 'not']);
    const words = sentence.toLowerCase().match(/\w+/g) || [];

    // We only care if there are words to analyze
    if (words.length > 0) {
        const keywords = words.filter(word => !stopWords.has(word));
        // Bonus for having a high ratio of keywords to total words
        const keywordDensity = keywords.length / words.length;
        score += keywordDensity * 5;
    }

    return score;
}

/**
 * Finds sentences in the DOM and wraps them in a highlight mark.
 * @param {string[]} topSentences - Array of the top highest-scoring sentences.
 * @returns {number} The number of sentences successfully highlighted.
 */
function highlightSentencesInDOM(topSentences) {
    let highlightedCount = 0;
    
    // Save current selection to restore later
    const selection = window.getSelection();
    let savedRange = null;
    if (selection && selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
    }

    for (const sentence of topSentences) {
        // Reset selection to start of document for each search
        selection.removeAllRanges();
        
        // window.find(aString, aCaseSensitive, aBackwards, aWrapAround, aWholeWord, aSearchInFrames, aShowDialog);
        // It's a bit of a legacy API but it works incredibly well for cross-node text finding in simple extensions.
        const found = window.find(sentence, false, false, true, false, false, false);
        
        if (found) {
            try {
                const range = selection.getRangeAt(0);
                
                // Tricky logic: surroundContents fails if the range splits a non-text node (like an element).
                // Try it first, if it fails, we fall back to wrapping individual text nodes piece by piece.
                const mark = document.createElement('mark');
                mark.className = 'nr-highlight';
                range.surroundContents(mark);
                highlightedCount++;
            } catch (e) {
                // Console log commented out to keep output clean, but this handles boundary splits
                highlightedCount += wrapRangeTextNodes(selection.getRangeAt(0));
            }
        }
    }

    // Restore original selection
    if (selection) {
        selection.removeAllRanges();
        if (savedRange) {
            selection.addRange(savedRange);
        }
    }

    // Return the number of successful highlights found
    return highlightedCount;
}

/**
 * Fallback highlighter for sentences that window.find() can find but surroundContents() rejects.
 * Wraps individual text nodes within a given range to preserve DOM structure while highlighting.
 */
function wrapRangeTextNodes(range) {
    const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (range.intersectsNode(node)) {
                    const parentTag = node.parentNode.nodeName.toLowerCase();
                    if (parentTag === 'script' || parentTag === 'style') return NodeFilter.FILTER_REJECT;
                    if (node.nodeValue.trim() === '') return NodeFilter.FILTER_SKIP;
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_REJECT;
            }
        }
    );

    const nodesToWrap = [];
  /**
 * Extracts article metadata to help the NLP engine categorize the page correctly.
 * @returns {Object} Metadata including word count and structure
 */
function extractPageMetadata() {
  const text = document.body.innerText || '';
  return {
    word_count: text.split(/\s+/).length,
    paragraph_count: document.querySelectorAll('p').length,
    heading_count: document.querySelectorAll('h1, h2, h3').length,
    lang: document.documentElement.lang || 'en'
  };
}

/**
 * Listens for messages from the background script.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract_text') {
    const text = document.body.innerText;
    const title = document.title;
    const metadata = extractPageMetadata();
    
    sendResponse({ 
      text: text, 
      title: title,
      metadata: metadata
    });
  } else if (request.action === 'apply_highlights') {
    const highlights = request.highlights || [];
    renderHighlights(highlights);
  }
});

/**
 * Renders highlights on the page, preserving importance tiers.
 */
function renderHighlights(highlights) {
  // Clear existing highlights first to avoid duplicates
  document.querySelectorAll('.nr-highlight').forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.innerText), el);
    parent.normalize();
  });

  highlights.forEach(h => {
    applyHighlight(h.sentence, h.importance_tier || 'important');
  });
}

/**
 * Finds and wraps text with a highlight span.
 * @param {string} text - The sentence to highlight
 * @param {string} tier - importance_tier (critical, important, notable)
 */
function applyHighlight(text, tier) {
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walk.nextNode()) {
    if (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE') continue;
    
    const index = node.textContent.indexOf(text);
    if (index !== -1) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + text.length);
      
      const span = document.createElement('span');
      span.className = `nr-highlight nr-highlight-${tier}`;
      span.title = `NeuralRead: ${tier.charAt(0).toUpperCase() + tier.slice(1)} Insight`;
      
      try {
        range.surroundContents(span);
      } catch (e) {
        // Fallback for complex nesting
        const content = node.textContent;
        const before = document.createTextNode(content.substring(0, index));
        const after = document.createTextNode(content.substring(index + text.length));
        span.textContent = text;
        const parent = node.parentNode;
        parent.insertBefore(before, node);
        parent.insertBefore(span, node);
        parent.insertBefore(after, node);
        parent.removeChild(node);
      }
      break; 
    }
  }
}
    let node;
    while (node = walker.nextNode()) {
        nodesToWrap.push(node);
    }

    if (nodesToWrap.length === 0) return 0;
    
    let partsWrapped = 0;

    for (let i = 0; i < nodesToWrap.length; i++) {
        const textNode = nodesToWrap[i];
        
        let startOffset = 0;
        let endOffset = textNode.nodeValue.length;
        
        if (textNode === range.startContainer) startOffset = range.startOffset;
        if (textNode === range.endContainer) endOffset = range.endOffset;
        
        if (startOffset === endOffset) continue;
        
        const text = textNode.nodeValue;
        const before = text.substring(0, startOffset);
        const match = text.substring(startOffset, endOffset);
        const after = text.substring(endOffset);
        
        const parent = textNode.parentNode;
        
        if (before) parent.insertBefore(document.createTextNode(before), textNode);
        
        if (match.trim()) {
            const mark = document.createElement('mark');
            mark.className = 'nr-highlight';
            mark.textContent = match;
            parent.insertBefore(mark, textNode);
            partsWrapped = 1; // It successfully highlighted a piece of this sentence
        }
        
        if (after) parent.insertBefore(document.createTextNode(after), textNode);
        
        parent.removeChild(textNode);
    }
    
    return partsWrapped; // Return 1 to indicate this logical sentence was highlighted
}

/**
 * Injects or updates a floating badge into the page.
 * @param {string|number} text - The text to display (e.g., number of highlights, '...', '!').
 * @param {boolean} isFallback - Whether this is a local fallback (changes badge style).
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
        if (isFallback) {
            badge.style.color = '#aaa';
            badge.style.borderColor = '#aaa';
        }
    }
}

/**
 * Runs the simple local heuristic scoring if the backend is unavailable.
 */
function fallbackLocalScoring(text) {
    console.log("NeuralRead: Running local scoring fallback...");
    const sentences = splitIntoSentences(text);
    const scoredSentences = sentences.map(s => ({
        text: s,
        score: scoreSentence(s)
    }));
    scoredSentences.sort((a, b) => b.score - a.score);
    const top3 = scoredSentences.slice(0, 3).map(s => s.text);
    
    const count = highlightSentencesInDOM(top3);
    injectOrUpdateBadge(count, true);
}

/**
 * Main execution function to initialize the content script logic.
 * Guarded against running on localhost/chrome pages as a double safety net
 * alongside manifest.json exclude_matches.
 */
async function initialize() {
    // Never run on localhost (our own dashboard), chrome pages, or Vercel production dashboard
    const hostname = window.location.hostname;
    const EXCLUDED_HOSTS = [
        'localhost',
        '127.0.0.1',
        'neural-read-dashboard-git-main-danishs-projects-25aab0a7.vercel.app'
    ];
    if (EXCLUDED_HOSTS.some(h => hostname.includes(h)) ||
        window.location.protocol === 'chrome-extension:' ||
        window.location.protocol === 'chrome:') {
        return;
    }

    try {
        const result = await chrome.storage.local.get([CONFIG.ENABLED_KEY]);
        const isEnabled = result[CONFIG.ENABLED_KEY] === true;

        if (!isEnabled) {
            console.log("NeuralRead is currently disabled for this page.");
            return;
        }

        console.log("NeuralRead Active: Extracting text...");
        const text = extractArticleText();

        if (!text) {
            console.warn("NeuralRead: No text extracted from this page.");
            return;
        }

        console.log("NeuralRead Extracted Text Summary:", text.substring(0, 300) + '...');
        
        // Indicate loading state
        injectOrUpdateBadge('...');

        // Send to background for API processing via safe wrapper
        safeSendMessage(
            { 
                type: 'EXTRACT', 
                payload: { 
                    text: text,
                    url: window.location.href,
                    title: document.title
                } 
            },
            (response) => {
                if (chrome.runtime.lastError || !response || response.status === 'error') {
                    console.warn("Backend extraction failed, falling back to local scoring:", 
                                 chrome.runtime.lastError?.message || response?.error);
                    fallbackLocalScoring(text);
                } else if (response.highlights) {
                    console.log("Received highlights from backend:", response.highlights);
                    const count = highlightSentencesInDOM(response.highlights);
                    injectOrUpdateBadge(count, false);
                } else {
                    injectOrUpdateBadge('!');
                }
            }
        );
    } catch (error) {
        console.error("Error initializing NeuralRead content script:", error);
        injectOrUpdateBadge('!');
    }
}

// ── Smart initialization with retry for JS-rendered pages ──
// Sites like Britannica render content via JS after DOMContentLoaded,
// so we retry extraction a few times before giving up.
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds between retries

/**
 * Attempts to initialize NeuralRead, retrying if no text is found
 * (handles JS-rendered pages that load content after initial parse).
 * @param {number} retryCount - Current retry attempt number.
 */
async function initializeWithRetry(retryCount = 0) {
    // Skip our own pages
    const hostname = window.location.hostname;
    const EXCLUDED_HOSTS = [
        'localhost',
        '127.0.0.1',
        'neural-read-dashboard-git-main-danishs-projects-25aab0a7.vercel.app'
    ];
    if (EXCLUDED_HOSTS.some(h => hostname.includes(h))) return;

    // Skip search engines and known non-article domains
    const NON_ARTICLE_HOSTS = ['google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'baidu.com', 'mail.google.com', 'drive.google.com', 'docs.google.com'];
    if (NON_ARTICLE_HOSTS.some(h => hostname.includes(h))) return;

    const text = extractArticleText();

    if (!text && retryCount < MAX_RETRIES) {
        console.log(`NeuralRead: No text found, retrying in ${RETRY_DELAY}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => initializeWithRetry(retryCount + 1), RETRY_DELAY);
        return;
    }

    if (!text) {
        console.warn('NeuralRead: No extractable text after all retries. Skipping.');
        return;
    }

    // Text found — run the main initialize logic
    await initialize();
}

// ── Entry point ──
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait 1s after DOM ready for initial JS rendering
        setTimeout(() => initializeWithRetry(), 1000);
    });
} else {
    // Page already loaded — wait 1.5s for JS to render content
    setTimeout(() => initializeWithRetry(), 1500);
}
