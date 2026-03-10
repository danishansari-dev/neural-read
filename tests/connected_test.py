import os
import time
from playwright.sync_api import sync_playwright

def run_test():
    print("Starting Playwright Connection Test...")
    extension_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../extension'))
    user_data_dir = os.path.join(os.path.dirname(__file__), 'tmp_user_data')
    
    with sync_playwright() as p:
        args = [
            f"--disable-extensions-except={extension_path}",
            f"--load-extension={extension_path}"
        ]
        
        print("Launching Chromium context with extensions enabled...")
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False,
            args=args
        )
        
        background = None
        for worker in context.service_workers:
            if "chrome-extension" in worker.url:
                background = worker
                break
        
        if not background:
            try:
                background = context.wait_for_event("serviceworker", timeout=10000)
            except Exception as e:
                pass
        
        if background:            
            background.evaluate("chrome.storage.local.set({ 'nr_enabled': true });")
            time.sleep(0.5)
        
        page = context.pages[0] if context.pages else context.new_page()
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        
        # We handle network requests to intercept the API call and log it
        page.on("request", lambda request: print(f"Network Request: {request.method} {request.url}"))
        page.on("response", lambda response: print(f"Network Response: {response.status} {response.url}"))

        print("Navigating to Wikipedia AI page...")
        page.goto('https://en.wikipedia.org/wiki/Artificial_intelligence', wait_until='networkidle')
        
        print("Waiting 6 seconds for extraction (with local fallback if API fails)...")
        time.sleep(6)
        
        screenshot_path = os.path.join(os.path.dirname(__file__), 'screenshot-connected-test.png')
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")
        
        badge_text = page.locator(".nr-badge").text_content() if page.locator(".nr-badge").count() > 0 else "None"
        print(f"\n--- Test Results ---")
        print(f"Badge text: {badge_text}")
        
        context.close()

if __name__ == '__main__':
    run_test()
