import time
from playwright.sync_api import sync_playwright

def test_events_listener():
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
            const log = [];
            
            // Listen to spline events
            app.addEventListener('mouseDown', (e) => {
                log.push({ event: 'mouseDown', name: e.target.name, id: e.target.id });
            });
            app.addEventListener('mouseHover', (e) => {
                log.push({ event: 'mouseHover', name: e.target.name });
            });

            window._eventLog = log;
            return true;
        }""")

        # Click on the center of the canvas where the robot is (container is at center: 600x500 at x=300, y=150)
        # Let's find container bounding box
        box = page.locator('#container').bounding_box()
        print("Container box:", box)
        center_x = box['x'] + box['width'] / 2
        center_y = box['y'] + box['height'] / 2
        print(f"Clicking on robot at ({center_x}, {center_y})...")
        page.mouse.click(center_x, center_y)
        time.sleep(0.5)

        log = page.evaluate("window._eventLog")
        print("Event log after click:", log)

        browser.close()

if __name__ == '__main__':
    test_events_listener()
