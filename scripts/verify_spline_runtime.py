import time
import sys
from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless=True
        )
        page = browser.new_page(viewport={'width': 1000, 'height': 800})
        page.on('console', lambda m: print(f"CONSOLE [{m.type}]: {m.text}"))
        page.on('pageerror', lambda e: print(f"PAGEERROR: {e}"))

        print("Navigating to http://localhost:3000/spline_test.html...")
        page.goto('http://localhost:3000/spline_test.html', wait_until='domcontentloaded')

        for i in range(15):
            time.sleep(1)
            status = page.evaluate("document.getElementById('status').innerText")
            print(f"Sec {i+1}: {status}")
            if "Loaded successfully" in status or "Error" in status:
                break

        page.screenshot(path='audit_evidence/spline_test_result.png')
        print("Captured audit_evidence/spline_test_result.png")

        # Now test inspection of methods and scene objects
        if page.evaluate("window.splineLoaded"):
            details = page.evaluate("""() => {
                const app = window.splineApp;
                const keys = [];
                for (let k in app) {
                    keys.push(k);
                }
                const protoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(app));
                return {
                    keys: keys.slice(0, 30),
                    protoKeys: protoKeys.slice(0, 30),
                    canvasWidth: app._canvas ? app._canvas.width : null,
                    canvasHeight: app._canvas ? app._canvas.height : null
                };
            }""")
            print("Spline App Details:", details)

        browser.close()

if __name__ == '__main__':
    verify()
