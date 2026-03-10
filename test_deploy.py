from playwright.sync_api import sync_playwright
import time
import sys

def run_tests():
    url = "https://neural-read-dashboard-git-main-danishs-projects-25aab0a7.vercel.app"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        
        print(f"--- Testing {url}/login ---")
        try:
            page.goto(f"{url}/login", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path="tests/deploy-01-login.png")
            text = page.inner_text("body")
            if "NeuralRead" in text:
                print("PASS: 'NeuralRead' visible on /login")
            else:
                print("FAIL: 'NeuralRead' NOT visible on /login")
            
            if errors:
                print(f"WARNING: Console errors found: {errors}")
            else:
                print("PASS: No console errors")
        except Exception as e:
            print(f"FAIL: Error navigating to /login: {e}")
            
        print(f"\n--- Testing {url}/vault ---")
        try:
            page.goto(f"{url}/vault", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path="tests/deploy-02-vault.png")
            if "/login" in page.url:
                print("PASS: Redirected to /login (Auth guard working on /vault)")
            else:
                print(f"FAIL: Did not redirect. Current URL: {page.url}")
        except Exception as e:
            print(f"FAIL: Error on /vault: {e}")
            
        print(f"\n--- Testing {url}/graph ---")
        try:
            page.goto(f"{url}/graph", wait_until="networkidle")
            time.sleep(2)
            page.screenshot(path="tests/deploy-03-graph.png")
            if "/login" in page.url:
                print("PASS: Redirected to /login (Auth guard working on /graph)")
            else:
                print(f"FAIL: Did not redirect. Current URL: {page.url}")
        except Exception as e:
            print(f"FAIL: Error on /graph: {e}")
            
        browser.close()

if __name__ == '__main__':
    run_tests()
