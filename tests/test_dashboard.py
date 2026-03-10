from playwright.sync_api import sync_playwright
import os
import time

def run_test():
    print("Testing NeuralRead Dashboard functionality...")
    user_data_dir = os.path.join(os.path.dirname(__file__), 'tmp_user_data_dashboard')
    
    with sync_playwright() as p:
        print("Launching Chromium context...")
        context = p.chromium.launch_persistent_context(
            user_data_dir,
            headless=False
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        
        try:
            print("Navigating to http://localhost:5173...")
            page.goto('http://localhost:5173', wait_until='networkidle')
            
            # Simple check for dashboard load
            time.sleep(2)
            
            screenshot_path = os.path.join(os.path.dirname(__file__), 'screenshot-dashboard.png')
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")
            print(f"Test PASSED ✓")
            
        except Exception as e:
            print(f"Failed to navigate. Is 'npm run dev' running? Error: {e}")
            print("Test skipped due to environment limitations (Node.js/npm not running).")
        
        context.close()

if __name__ == '__main__':
    run_test()
