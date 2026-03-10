import re
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer
from sumy.nlp.stemmers import Stemmer
from sumy.utils import get_stop_words

def simple_score(sentence: str) -> float:
    """
    Fallback/Auxiliary scoring for sentences based on heuristics.
    """
    score = 0.0
    length = len(sentence)
    if 100 <= length <= 200:
        score += 0.5
    elif length > 50:
        score += 0.2
    
    # Check for numbers/stats
    if any(char.isdigit() for char in sentence):
        score += 0.5
        
    return min(1.0, score)

def extract_highlights(text: str) -> list[dict]:
    """
    Extract top 3 highlight-worthy sentences from text using Sumy LSA.
    Falls back to length/number heuristics if Sumy fails.
    """
    text = text.strip()
    if not text:
        return []

    try:
        parser = PlaintextParser.from_string(text, Tokenizer("english"))
        stemmer = Stemmer("english")
        summarizer = LsaSummarizer(stemmer)
        summarizer.stop_words = get_stop_words("english")
        
        # Get top 3 sentences using LSA
        sentences = summarizer(parser.document, 3)
        
        highlights = []
        for i, sentence in enumerate(sentences):
            sent_str = str(sentence)
            if len(sent_str) > 50:
                # Combine LSA rank with our heuristic for a 0-1 score
                base_score = simple_score(sent_str)
                # Boost based on LSA relative ranking (highest gets +0.3)
                final_score = min(1.0, base_score + (0.3 - (i * 0.1)))
                highlights.append({
                    "sentence": sent_str,
                    "score": round(final_score, 2)
                })
        
        # If extraction got empty results, use fallback
        if not highlights:
            raise ValueError("No highlights extracted by LSA")
            
        return highlights
    except Exception as e:
        print(f"Sumy extraction failed: {e}. Falling back to basic chunking.")
        # Fallback heuristic logic
        sentences = [s.strip() for s in text.split(". ") if len(s.strip()) > 50]
        scored = []
        for s in sentences:
            sent_str = s if s.endswith(".") else s + "."
            scored.append({
                "sentence": sent_str,
                "score": round(simple_score(sent_str), 2)
            })
        # Sort by score desc
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:3]
