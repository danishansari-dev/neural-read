import json
import os

outputs = [
    r"C:\Users\daans\.gemini\antigravity\brain\5693afdb-580c-49af-a3ed-216a43b1e6bd\.system_generated\steps\822\output.txt",
    r"C:\Users\daans\.gemini\antigravity\brain\5693afdb-580c-49af-a3ed-216a43b1e6bd\.system_generated\steps\823\output.txt",
    r"C:\Users\daans\.gemini\antigravity\brain\5693afdb-580c-49af-a3ed-216a43b1e6bd\.system_generated\steps\824\output.txt"
]

articles = []
for out_path in outputs:
    if os.path.exists(out_path):
        with open(out_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                url = data.get("metadata", {}).get("url", "unknown-url")
                markdown = data.get("markdown", "")
                articles.append({"url": url, "text": markdown[:5000]}) # Limit to 5k chars for sanity
            except Exception as e:
                print(f"Error parsing {out_path}: {e}")
                
with open(r"d:\Projects\neural-read\tests\e2e-articles.json", "w", encoding='utf-8') as f:
    json.dump(articles, f, indent=2)

print("Parsed and saved 3 articles to tests/e2e-articles.json")
