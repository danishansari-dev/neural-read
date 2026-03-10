/**
 * Content script injected into webpages.
 * This exists to read the DOM, extract the main article text, and apply highlights
 * without requiring the user to manually trigger anything.
 */

/**
 * Extracts the main article text from the current page using a simple paragraph scraper.
 * @returns {string} The extracted text content, joined by newlines.
 */
function extractArticleText() {
    try {
        // Simple heuristic: gather all paragraph elements.
        // This is a naive approach; tricky logic might be needed later to filter out 
        // nav bars, sidebars, or cookie notices.
        const paragraphs = document.querySelectorAll('p');
        let extractedText = '';

        paragraphs.forEach(p => {
            const text = p.textContent.trim();
            // Ignore very short paragraphs which are often metadata, UI elements, or copyright notices
            if (text.length > 50) {
                extractedText += text + '\n\n';
            }
        });

        return extractedText;
    } catch (error) {
        console.error("Failed to extract article text:", error);
        return "";
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
 */
async function initialize() {
    try {
        const result = await chrome.storage.local.get(['nr_enabled']);
        const isEnabled = result.nr_enabled === true;

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

        // Send to background for API processing
        chrome.runtime.sendMessage(
            { 
                type: 'EXTRACT', 
                payload: { 
                    content: text,
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

// Ensure the DOM is fully loaded before trying to extract text to ensure we don't miss content
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
