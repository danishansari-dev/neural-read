from playwright.sync_api import sync_playwright
import time
import requests
import json
import os

def run_tests():
    backend_url = "https://neural-read-api.onrender.com/"
    docs_url = "https://neural-read-api.onrender.com/docs"
    
    # Create tests directory if it doesn't exist
    os.makedirs("tests", exist_ok=True)
    
    print(f"--- Testing Backend API: {backend_url} ---")
    try:
        response = requests.get(backend_url)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            print("PASS: Backend is live and healthy")
        else:
            print("FAIL: Backend returned non-200 status")
            
        # Try /health just to see
        health_response = requests.get("https://neural-read-api.onrender.com/health")
        print(f"/health Status Code: {health_response.status_code}")
    except Exception as e:
        print(f"FAIL: Error reaching backend: {e}")
    
    print(f"\n--- Snapping Docs Page: {docs_url} ---")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            page.goto(docs_url, wait_until="networkidle")
            time.sleep(3) # Wait for page to finish loading Swagger UI
            page.screenshot(path="tests/backend-live.png", full_page=True)
            print("PASS: Saved screenshot to tests/backend-live.png")
            browser.close()
    except Exception as e:
        print(f"FAIL: Error capturing playwright screenshot: {e}")

if __name__ == '__main__':
    run_tests()
