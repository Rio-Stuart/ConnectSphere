import time
from playwright.sync_api import sync_playwright

def inspect_meshes():
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

        mesh_info = page.evaluate("""() => {
            const app = window.splineApp;
            const res = [];
            if (app._scene) {
                app._scene.traverse(obj => {
                    if (obj.isMesh) {
                        res.push({
                            name: obj.name,
                            visible: obj.visible,
                            materialType: obj.material ? obj.material.type : null,
                            materialColor: obj.material && obj.material.color ? '#' + obj.material.color.getHexString() : null,
                            opacity: obj.material ? obj.material.opacity : null,
                            transparent: obj.material ? obj.material.transparent : null,
                            position: obj.position,
                            scale: obj.scale
                        });
                    }
                });
            }
            return res;
        }""")
        print("Meshes in scene:")
        for m in mesh_info:
            print("  ", m)

        browser.close()

if __name__ == '__main__':
    inspect_meshes()
