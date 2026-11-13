import time
from playwright.sync_api import sync_playwright

def inspect():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless=True,
            args=[
                '--enable-webgl',
                '--ignore-gpu-blocklist',
                '--enable-gpu-rasterization'
            ]
        )
        page = browser.new_page(viewport={'width': 1200, 'height': 800})
        page.goto('http://localhost:3000/spline_test.html', wait_until='domcontentloaded')

        # Wait until loaded
        for _ in range(10):
            time.sleep(0.5)
            if page.evaluate("window.splineLoaded"):
                break

        scene_details = page.evaluate("""() => {
            const app = window.splineApp;
            if (!app) return { error: 'No app' };

            const info = {
                protoMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(app)),
                variables: {},
                objects: [],
                camera: null
            };

            // Check variables
            if (typeof app.getVariables === 'function') {
                info.variables = app.getVariables();
            }

            // Check scene objects if accessible
            if (app._scene) {
                app._scene.traverse(obj => {
                    info.objects.push({
                        name: obj.name,
                        type: obj.type,
                        uuid: obj.uuid,
                        visible: obj.visible,
                        hasMaterial: Boolean(obj.material)
                    });
                });
            }

            // Check camera
            if (app._camera) {
                info.camera = {
                    type: app._camera.type,
                    position: app._camera.position
                };
            }

            return info;
        }""")

        print("=== SPLINE SCENE DETAILS ===")
        print("Methods:", scene_details.get('protoMethods'))
        print("Variables:", scene_details.get('variables'))
        print("Camera:", scene_details.get('camera'))
        print(f"Total Objects: {len(scene_details.get('objects', []))}")
        print("Sample Objects:")
        for obj in scene_details.get('objects', [])[:30]:
            print(f"  - {obj['name']} ({obj['type']}), visible={obj['visible']}")

        browser.close()

if __name__ == '__main__':
    inspect()
