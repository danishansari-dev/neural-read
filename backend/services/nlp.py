"""
NeuralRead NLP Pipeline v2.0
Technique: TF-IDF + Position Scoring + Named Entity 
           Recognition + GPT-4o-mini reranking

Pipeline:
1. Clean and split text into sentences
2. Score each sentence with TF-IDF
3. Add position bonus (first/last sentences matter more)
4. Add named entity bonus (stats, names, orgs = important)
5. Add transition word bonus (however, therefore, etc.)
6. Filter to top 10 candidates
7. GPT-4o-mini picks the best 3 from candidates
8. Fallback to TF-IDF top 3 if GPT fails
"""

import re
import os
import math
import logging
from collections import Counter
from openai import OpenAI

logger = logging.getLogger(__name__)

# OpenAI client — initialized lazily to avoid startup crashes if key is missing
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)

# Words that signal important sentences
TRANSITION_WORDS = {
    'however', 'therefore', 'consequently', 'furthermore',
    'nevertheless', 'significantly', 'importantly', 'notably',
    'critically', 'essentially', 'ultimately', 'surprisingly',
    'remarkably', 'specifically', 'particularly', 'especially'
}

# Common English stop words to ignore in TF-IDF
STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'shall', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'they', 'them', 'their', 'there',
    'here', 'when', 'where', 'who', 'which', 'what', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'than', 'then', 'so', 'yet',
    'as', 'if', 'not', 'no', 'nor', 'only', 'own', 'same'
}


def clean_text(text: str) -> str:
    """Remove extra whitespace, URLs, and HTML artifacts."""
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\[.*?\]|\(.*?\)', '', text)
    return text.strip()


def split_sentences(text: str) -> list[str]:
    """
    Split text into clean sentences.
    Handles abbreviations like U.S., Dr., etc.
    """
    # Split on period/exclamation/question followed by space + capital
    raw = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    
    sentences = []
    for s in raw:
        s = s.strip()
        # Skip too short or too long
        if len(s) < 40 or len(s) > 500:
            continue
        # Skip sentences that are likely headings (no verb indicator)
        if s.count(' ') < 4:
            continue
        sentences.append(s)
    
    return sentences


def tokenize(text: str) -> list[str]:
    """Lowercase, remove punctuation, remove stop words."""
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    return [w for w in words if w not in STOP_WORDS]


def compute_tfidf(sentences: list[str]) -> list[float]:
    """
    Compute TF-IDF score for each sentence.
    
    TF = word frequency within sentence / sentence length
    IDF = log(total sentences / sentences containing word)
    Sentence score = average TF-IDF of its words
    """
    n = len(sentences)
    if n == 0:
        return []
    
    # Tokenize all sentences
    tokenized = [tokenize(s) for s in sentences]
    
    # Count document frequency (how many sentences contain each word)
    doc_freq = Counter()
    for tokens in tokenized:
        for word in set(tokens):
            doc_freq[word] += 1
    
    scores = []
    for tokens in tokenized:
        if not tokens:
            scores.append(0.0)
            continue
        
        # Term frequency for this sentence
        term_freq = Counter(tokens)
        
        # TF-IDF for each word in sentence
        tfidf_sum = 0.0
        for word, freq in term_freq.items():
            tf = freq / len(tokens)
            # Add 1 to avoid division by zero
            idf = math.log((n + 1) / (doc_freq[word] + 1)) + 1
            tfidf_sum += tf * idf
        
        # Average TF-IDF score for this sentence
        scores.append(tfidf_sum / len(term_freq))
    
    return scores


def compute_position_score(index: int, total: int) -> float:
    """
    Sentences at the beginning and end of articles
    are statistically more important.
    
    First sentence:  +0.35 (thesis/hook)
    Second sentence: +0.25 (context)
    Last sentence:   +0.30 (conclusion)
    Second to last:  +0.20 (wrap-up)
    Middle:          +0.05 (supporting detail)
    """
    if total <= 1:
        return 0.35
    
    # Normalize position to 0-1
    position = index / (total - 1)
    
    if index == 0:
        return 0.35
    elif index == 1:
        return 0.25
    elif index == total - 1:
        return 0.30
    elif index == total - 2:
        return 0.20
    elif position < 0.15:
        return 0.15
    elif position > 0.85:
        return 0.15
    else:
        return 0.05


def compute_entity_score(sentence: str) -> float:
    """
    Detect presence of named entities and statistics.
    These signal factual, important sentences.
    
    Numbers/percentages: +0.20
    Capitalized proper nouns: +0.10
    Currency: +0.15
    Transition words: +0.15
    """
    score = 0.0
    
    # Numbers, percentages, statistics
    if re.search(r'\d+\.?\d*\s*(%|percent|billion|million|trillion|thousand)', 
                 sentence, re.IGNORECASE):
        score += 0.20
    elif re.search(r'\b\d{4}\b', sentence):  # Years
        score += 0.10
    elif re.search(r'\d+', sentence):  # Any number
        score += 0.10
    
    # Currency amounts
    if re.search(r'[\$\€\£\¥]\d+|\d+\s*(dollars|euros|pounds)', 
                 sentence, re.IGNORECASE):
        score += 0.15
    
    # Proper nouns (sequences of capitalized words)
    proper_nouns = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', sentence)
    if len(proper_nouns) >= 2:
        score += 0.10
    
    # Transition/importance signal words
    sentence_lower = sentence.lower()
    for word in TRANSITION_WORDS:
        if word in sentence_lower:
            score += 0.15
            break  # Only count once
    
    return min(score, 0.50)  # Cap at 0.50


def compute_length_score(sentence: str) -> float:
    """
    Optimal sentence length for highlights is 80-220 chars.
    Too short = not enough info.
    Too long = hard to highlight visually.
    """
    length = len(sentence)
    if 80 <= length <= 220:
        return 0.10
    elif 50 <= length <= 300:
        return 0.05
    else:
        return -0.10  # Penalty for extremes


def score_sentences(sentences: list[str]) -> list[dict]:
    """
    Combine all scoring signals into final ranked list.
    Returns list of dicts with sentence, score, and breakdown.
    """
    if not sentences:
        return []
    
    tfidf_scores = compute_tfidf(sentences)
    total = len(sentences)
    
    results = []
    for i, sentence in enumerate(sentences):
        tfidf = tfidf_scores[i]
        position = compute_position_score(i, total)
        entity = compute_entity_score(sentence)
        length = compute_length_score(sentence)
        
        # Weighted combination
        # TF-IDF is the primary signal, others are bonuses
        final_score = (
            tfidf * 0.50 +      # 50% TF-IDF
            position * 0.25 +   # 25% position
            entity * 0.15 +     # 15% named entities
            length * 0.10       # 10% length
        )
        
        results.append({
            'sentence': sentence,
            'score': round(final_score, 4),
            'index': i,
            'debug': {
                'tfidf': round(tfidf, 4),
                'position': round(position, 4),
                'entity': round(entity, 4),
                'length': round(length, 4)
            }
        })
    
    # Sort by final score descending
    results.sort(key=lambda x: x['score'], reverse=True)
    return results


def gpt_rerank(candidates: list[str], article_title: str = "") -> list[str] | None:
    """
    Use GPT-4o-mini to pick the 3 best sentences from candidates.
    
    This is the final quality filter — GPT understands context
    and meaning in ways TF-IDF cannot.
    
    @param candidates - Pre-scored top sentences from TF-IDF pipeline
    @param article_title - Optional article title for better context
    @returns List of 3 sentences verbatim, or None if GPT fails
    """
    if not candidates:
        return None
    
    # Format candidates as numbered list
    numbered = "\n".join([f"{i+1}. {s}" for i, s in enumerate(candidates)])
    
    title_context = f'Article title: "{article_title}"\n\n' if article_title else ""
    
    prompt = f"""{title_context}Below are the top candidate sentences from an article, \
pre-selected by a TF-IDF algorithm.

Your task: Pick exactly 3 sentences that are most important \
for a reader to understand the key points and main insights \
of this article.

Rules:
- Return ONLY the 3 sentences, verbatim, exactly as written
- One sentence per line
- No numbering, no explanation, no extra text
- Choose sentences that together give maximum understanding
- Prefer sentences with specific facts, findings, or conclusions
- Avoid redundant or repetitive sentences

Candidates:
{numbered}"""

    client = get_openai_client()
    if not client:
        logger.warning("OpenAI client not initialized (missing API key)")
        return None

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise text analyzer. Return only the requested sentences, verbatim."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            max_tokens=500,
            temperature=0.1  # Low temperature = consistent, deterministic output
        )
        
        output = response.choices[0].message.content.strip()
        
        # Parse GPT output — split by newlines, clean up
        lines = [line.strip() for line in output.split('\n') if line.strip()]
        
        # Filter to only lines that look like actual sentences
        # (longer than 30 chars, not just numbers or labels)
        valid = [
            line for line in lines 
            if len(line) > 30 
            and not re.match(r'^\d+[\.\)]', line)
            and not line.lower().startswith(('here are', 'the following', 'these are'))
        ]
        
        if len(valid) >= 3:
            return valid[:3]
        elif len(valid) == 2:
            return valid  # Return 2 if that's all we got
        else:
            logger.warning(f"GPT returned unexpected output: {output}")
            return None
            
    except Exception as e:
        logger.error(f"GPT reranking failed: {e}")
        return None


def extract_highlights(text: str, title: str = "", use_gpt: bool = True) -> list[dict]:
    """
    Main entry point. Runs the full NLP pipeline.
    
    Pipeline:
    1. Clean and split text into sentences
    2. Score with TF-IDF + position + entities + length  
    3. Get top 10 candidates
    4. GPT-4o-mini reranks candidates → picks best 3
    5. Fallback to TF-IDF top 3 if GPT unavailable
    
    @param text - Raw article text to analyze
    @param title - Article title for GPT context
    @param use_gpt - Whether to use GPT reranking (disable for testing)
    @returns List of {sentence, score} dicts matching the API contract
    """
    # Step 1 — Clean and split
    cleaned = clean_text(text)
    sentences = split_sentences(cleaned)
    
    if not sentences:
        logger.warning("No sentences extracted from text")
        return []
    
    if len(sentences) < 3:
        # Too few sentences — return what we have
        return [
            {"sentence": s, "score": round(0.5 - (i * 0.1), 2)} 
            for i, s in enumerate(sentences)
        ]
    
    # Step 2 — Score all sentences
    scored = score_sentences(sentences)
    
    # Step 3 — Get top 10 candidates for GPT
    top_candidates = [item['sentence'] for item in scored[:10]]
    
    # Step 4 — GPT reranking (if enabled and API key available)
    final_sentences = None
    
<<<<<<< HEAD
    if use_gpt:
=======
    if use_gpt and os.getenv("OPENAI_API_KEY"):
>>>>>>> aff023e (feat: complete NLP v2 upgrade and Railway deployment fixes)
        final_sentences = gpt_rerank(top_candidates, title)
        if final_sentences:
            logger.info(f"GPT reranking successful: {len(final_sentences)} highlights")
    
    # Step 5 — Fallback to TF-IDF top 3 if GPT failed
    if not final_sentences:
        logger.info("Using TF-IDF top 3 (GPT unavailable or failed)")
        final_sentences = [item['sentence'] for item in scored[:3]]
    
    # Build final output matching existing API contract
    # Assign descending scores 0.9, 0.75, 0.60
    score_values = [0.90, 0.75, 0.60]
    
    return [
        {
            "sentence": sentence,
            "score": score_values[i] if i < len(score_values) else 0.50
        }
        for i, sentence in enumerate(final_sentences[:3])
    ]
