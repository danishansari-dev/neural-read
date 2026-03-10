from playwright.sync_api import sync_playwright
import time
import requests

def run_tests():
    dashboard_url = "https://neural-read-dashboard.vercel.app/login"
    backend_url = "https://neural-read-api.onrender.com/"
    
    print(f"--- Testing Backend API: {backend_url} ---")
    try:
        response = requests.get(backend_url)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            print("PASS: Backend is live and healthy")
        else:
            print("FAIL: Backend returned non-200 status")
    except Exception as e:
        print(f"FAIL: Error reaching backend: {e}")
    
    print(f"\n--- Testing Vercel Dashboard: {dashboard_url} ---")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            page.goto(dashboard_url, wait_until="networkidle")
            time.sleep(3) # Wait for animations/load
            page.screenshot(path="tests/final-deploy.png", full_page=True)
            
            text = page.inner_text("body")
            if "NeuralRead" in text:
                print("PASS: 'NeuralRead' app loaded successfully.")
            else:
                print("FAIL: 'NeuralRead' NOT found on the page.")
                
            browser.close()
    except Exception as e:
        print(f"FAIL: Try running playwright script: {e}")

if __name__ == '__main__':
    run_tests()
