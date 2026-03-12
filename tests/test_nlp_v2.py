"""
Test script for NeuralRead NLP v2.0 pipeline.
Validates TF-IDF scoring, sentence splitting, and full pipeline output.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from services.nlp import (
    split_sentences, 
    compute_tfidf, 
    score_sentences,
    extract_highlights,
    clean_text
)

def test_pipeline():
    text = """
    Artificial intelligence is transforming every industry on the planet. 
    OpenAI raised $6.6 billion in its latest funding round, pushing its 
    valuation to $157 billion. Machine learning models can now generate 
    human-quality text, images, and code. The sky is blue and the grass 
    is green. However, researchers warn that safety concerns remain 
    unresolved as systems become more powerful. Governments worldwide are 
    scrambling to create regulatory frameworks before AI capabilities 
    outpace human oversight. The weather today is quite pleasant for 
    a walk. Experts predict that by 2030, AI will contribute over 
    $15 trillion to the global economy. Some sentences are just filler 
    and should not be highlighted at all.
    """
    
    print("=== NeuralRead NLP v2 Test ===\n")
    
    cleaned = clean_text(text)
    sentences = split_sentences(cleaned)
    print(f"Sentences found: {len(sentences)}")
    
    scored = score_sentences(sentences)
    print("\nTop 5 by TF-IDF + Position scoring:")
    for i, item in enumerate(scored[:5]):
        print(f"{i+1}. Score: {item['score']:.4f}")
        print(f"   {item['sentence'][:80]}...")
        print(f"   Debug: {item['debug']}")
    
    print("\n=== Testing full pipeline (with GPT) ===")
    highlights = extract_highlights(text, title="AI Industry Report", use_gpt=True)
    print(f"\nFinal highlights ({len(highlights)}):")
    for i, h in enumerate(highlights):
        print(f"{i+1}. [{h['score']}] {h['sentence']}")
    
    print("\n=== Testing fallback (no GPT) ===")
    highlights_no_gpt = extract_highlights(text, title="AI Industry Report", use_gpt=False)
    print(f"\nFallback highlights ({len(highlights_no_gpt)}):")
    for i, h in enumerate(highlights_no_gpt):
        print(f"{i+1}. [{h['score']}] {h['sentence']}")
    
    print("\n=== PASS ✅ ===")

if __name__ == "__main__":
    test_pipeline()
