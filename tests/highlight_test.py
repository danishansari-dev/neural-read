import os
import time
from playwright.sync_api import sync_playwright

def run_test():
    print("Starting Playwright Auto-Highlight test...")
    extension_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../extension'))
    user_data_dir = os.path.join(os.path.dirname(__file__), 'tmp_user_data')
    
    with sync_playwright() as p:
        # Launch Chrome with extension
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
        
        # Attempt to get the background service worker or page to set storage
        print("Locating extension context to set nr_enabled...")
        background = None
        for worker in context.service_workers:
            if "chrome-extension" in worker.url:
                background = worker
                break
        
        if not background:
            try:
                background = context.wait_for_event("serviceworker", timeout=10000)
            except Exception as e:
                print("Could not find background service worker, fallback to background pages...")
        
        # If no service worker (perhaps background page instead of module), try background pages
        if not background:
            for page in context.background_pages:
                if "chrome-extension" in page.url:
                    background = page
                    break
                    
        if background:            
            print("Setting nr_enabled=true in chrome.storage.local...")
            background.evaluate("chrome.storage.local.set({ 'nr_enabled': true });")
            # Wait a tick for storage to settle
            time.sleep(0.5)
        else:
            print("Warning: Could not isolate background worker/page. Test might fail if nr_enabled check depends on it.")
        
        page = context.pages[0] if context.pages else context.new_page()
        
        # Capture console messages to debug the content script
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        
        print("Navigating to Wikipedia AI page...")
        page.goto('https://en.wikipedia.org/wiki/Artificial_intelligence', wait_until='networkidle')
        
        print("Waiting 3 seconds for content script to process and highlight...")
        time.sleep(3)
        
        screenshot_path = os.path.join(os.path.dirname(__file__), 'screenshot-highlight-test.png')
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")
        
        # Check elements
        highlight_count = page.locator(".nr-highlight").count()
        badge_count = page.locator(".nr-badge").count()
        
        print("\n--- Test Results ---")
        # Each sentence may produce multiple <mark> elements when it spans across inline tags (e.g. <a>, <b>)
        print(f"Highlights found: {highlight_count} (Expected: >= 3)")
        print(f"Badge appeared: {'Yes' if badge_count > 0 else 'No'} (Expected: Yes)")
        
        passed = highlight_count >= 3 and badge_count > 0
        print(f"\nTest {'PASSED ✓' if passed else 'FAILED ✗'}")
        
        context.close()

if __name__ == '__main__':
    run_test()
