import time
from playwright.sync_api import sync_playwright

def test_interaction():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless=True,
            args=['--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
        )
        page = browser.new_page(viewport={'width': 1200, 'height': 800})
        page.goto('http://localhost:3000/spline_test.html', wait_until='domcontentloaded')

        for _ in range(10):
            time.sleep(0.5)
            if page.evaluate("window.splineLoaded"):
                break

        res = page.evaluate("""() => {
            const app = window.splineApp;
            const targetObj = app.findObjectById('b3d6cfd0-1bbe-4416-a91d-071250a9adac');
            return {
                targetName: targetObj ? targetObj.name : null,
                targetType: targetObj ? targetObj.type : null,
            };
        }""")
        print("LookAt Target:", res)

        # Test setBackgroundColor
        print("\nTesting setBackgroundColor('transparent')...")
        page.evaluate("window.splineApp.setBackgroundColor('transparent');")
        page.screenshot(path='audit_evidence/spline_transparent.png')

        # Test mouse movement: move mouse to top-left, take screenshot
        print("Moving mouse to top-left (100, 100)...")
        page.mouse.move(100, 100)
        time.sleep(0.5)
        page.screenshot(path='audit_evidence/spline_mouse_top_left.png')

        # Move mouse to bottom-right (900, 700), take screenshot
        print("Moving mouse to bottom-right (900, 700)...")
        page.mouse.move(900, 700)
        time.sleep(0.5)
        page.screenshot(path='audit_evidence/spline_mouse_bottom_right.png')

        print("Screenshots captured for interaction test.")
        browser.close()

if __name__ == '__main__':
    test_interaction()
