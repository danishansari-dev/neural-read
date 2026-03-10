import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from services.nlp import extract_highlights

def main():
    with open('tests/sample-article.txt', 'r', encoding='utf-8') as f:
        text = f.read()
    
    print(f"Loaded article with {len(text)} characters.")
    print("Running NLP extraction...")
    
    try:
        highlights = extract_highlights(text)
        print("\n--- EXTRACTED HIGHLIGHTS ---")
        for i, h in enumerate(highlights, 1):
            print(f"[{i}] {h['sentence']} (Score: {h['score']})")
    except Exception as e:
        print(f"Error extracting highlights: {e}")

if __name__ == "__main__":
    main()
