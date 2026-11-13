import time
from playwright.sync_api import sync_playwright

def test_global_events():
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
            if (typeof app.setGlobalEvents === 'function') {
                app.setGlobalEvents(true);
                return 'setGlobalEvents(true) succeeded';
            }
            return 'setGlobalEvents not a function';
        }""")
        print("setGlobalEvents result:", res)

        # Move mouse far away outside container (e.g. 50, 50)
        page.mouse.move(50, 50)
        time.sleep(0.5)
        # Check Cabeza rotation
        rot_top_left = page.evaluate("""() => {
            const obj = window.splineApp.findObjectByName('Cabeza');
            return obj ? { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z } : null;
        }""")
        print("Cabeza rotation with mouse at (50, 50):", rot_top_left)

        # Move mouse to far bottom right (1100, 750)
        page.mouse.move(1100, 750)
        time.sleep(0.5)
        rot_bottom_right = page.evaluate("""() => {
            const obj = window.splineApp.findObjectByName('Cabeza');
            return obj ? { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z } : null;
        }""")
        print("Cabeza rotation with mouse at (1100, 750):", rot_bottom_right)

        browser.close()

if __name__ == '__main__':
    test_global_events()
