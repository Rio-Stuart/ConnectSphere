import time
from playwright.sync_api import sync_playwright

def inspect_lights():
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

        lights_info = page.evaluate("""() => {
            const app = window.splineApp;
            const lights = [];
            if (app._scene) {
                app._scene.traverse(obj => {
                    if (obj.isLight) {
                        lights.push({
                            name: obj.name,
                            type: obj.type,
                            color: obj.color ? '#' + obj.color.getHexString() : null,
                            groundColor: obj.groundColor ? '#' + obj.groundColor.getHexString() : null,
                            intensity: obj.intensity,
                            position: obj.position
                        });
                    }
                });
            }
            return lights;
        }""")
        print("Lights in scene:")
        for l in lights_info:
            print("  ", l)

        browser.close()

if __name__ == '__main__':
    inspect_lights()
