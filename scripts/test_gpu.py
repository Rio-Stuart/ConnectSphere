import time
from playwright.sync_api import sync_playwright

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless=True,
            args=[
                '--enable-webgl',
                '--ignore-gpu-blocklist',
                '--enable-gpu-rasterization',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        )
        page = browser.new_page(viewport={'width': 1000, 'height': 800})
        page.on('console', lambda m: print(f"CONSOLE [{m.type}]: {m.text}", flush=True))
        page.on('pageerror', lambda e: print(f"PAGEERROR: {e}", flush=True))

        print("Navigating to http://localhost:3000/spline_test.html...", flush=True)
        page.goto('http://localhost:3000/spline_test.html', wait_until='domcontentloaded')

        for i in range(15):
            time.sleep(1)
            try:
                status = page.evaluate("document.getElementById('status').innerText")
                print(f"Sec {i+1}: {status}", flush=True)
                if "Loaded successfully" in status or "Error" in status:
                    break
            except Exception as e:
                print(f"Sec {i+1} eval error: {e}", flush=True)

        page.screenshot(path='audit_evidence/spline_test_result.png')
        print("Captured audit_evidence/spline_test_result.png", flush=True)
        browser.close()

if __name__ == '__main__':
    test()
