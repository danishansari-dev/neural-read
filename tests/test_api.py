import json
from playwright.sync_api import sync_playwright

def test_nlp_api():
    with open('tests/sample-article.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        # NOTE: This expects the FastAPI backend to be running on localhost:8000
        print("Testing POST /api/v1/extract...")
        try:
            response = context.request.post(
                "http://localhost:8000/api/v1/extract",
                data={
                    "text": text,
                    "url": "https://www.theverge.com/ai-artificial-intelligence/891514/anthropic-pentagon-lawsuit",
                    "title": "Anthropic Pentagon Lawsuit"
                }
            )
            
            print(f"Status: {response.status}")
            data = response.json()
            print("Response:", json.dumps(data, indent=2))
            
            with open('tests/api-test-results.json', 'w') as out_f:
                json.dump(data, out_f, indent=2)
                
            print("Taking screenshot of API docs...")
            page.goto("http://localhost:8000/docs")
            page.screenshot(path="tests/screenshot-api-docs.png")
            print("Success. Saved screenshot-api-docs.png")
            
        except Exception as e:
            print(f"Failed to connect to API (is the backend running?): {e}")
        
        finally:
            browser.close()

if __name__ == "__main__":
    test_nlp_api()
