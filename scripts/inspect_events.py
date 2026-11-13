import time
from playwright.sync_api import sync_playwright

def inspect_events():
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

        events = page.evaluate("""() => {
            const app = window.splineApp;
            if (!app) return null;
            if (typeof app.getSplineEvents === 'function') {
                return app.getSplineEvents();
            }
            return 'No getSplineEvents';
        }""")
        print("Spline Events:", events)

        # Check background color and ambient light
        bg_and_lights = page.evaluate("""() => {
            const app = window.splineApp;
            const res = {};
            if (app._renderer) {
                res.clearColor = app._renderer.getClearColor(new (app._renderer.getClearColor().constructor)());
                res.clearAlpha = app._renderer.getClearAlpha();
            }
            if (app._scene) {
                res.sceneBackground = app._scene.background;
            }
            return res;
        }""")
        print("Renderer clear color & scene background:", bg_and_lights)

        browser.close()

if __name__ == '__main__':
    inspect_events()
