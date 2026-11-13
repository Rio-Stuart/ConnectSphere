import time
from playwright.sync_api import sync_playwright

def test_runtime():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless=True
        )
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        
        console_messages = []
        page.on('console', lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: console_messages.append(f"[PAGEERROR] {err}"))

        # Create a test page in memory that uses @splinetool/runtime
        html = """
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; background: #16161c; width: 100vw; height: 100vh; overflow: hidden; }
            #canvas3d { width: 100%; height: 100%; display: block; }
          </style>
        </head>
        <body>
          <canvas id="canvas3d"></canvas>
          <script type="module">
            import { Application } from 'https://unpkg.com/@splinetool/runtime@2.0.183/build/runtime.js';
            window.splineApp = null;
            window.splineReady = false;
            window.splineError = null;
            try {
              const canvas = document.getElementById('canvas3d');
              const spline = new Application(canvas);
              window.splineApp = spline;
              console.log('Loading scene.splinecode...');
              await spline.load('http://localhost:3000/assets/scene.splinecode');
              console.log('Spline loaded successfully!');
              window.splineReady = true;
            } catch (err) {
              console.error('Spline load error:', err);
              window.splineError = String(err);
            }
          </script>
        </body>
        </html>
        """
        page.set_content(html)
        
        # Wait up to 15 seconds for splineReady
        for i in range(15):
            time.sleep(1)
            ready = page.evaluate("window.splineReady")
            error = page.evaluate("window.splineError")
            print(f"Sec {i+1}: ready={ready}, error={error}")
            if ready or error:
                break

        print("\nConsole messages:")
        for m in console_messages:
            print("  ", m)

        if page.evaluate("window.splineReady"):
            # Inspect scene properties
            scene_info = page.evaluate("""() => {
                const app = window.splineApp;
                if (!app) return null;
                const res = {
                    hasApp: true,
                    methods: Object.getOwnPropertyNames(Object.getPrototypeOf(app)),
                };
                try {
                    // Check if getVariables or similar exists
                    if (app.getVariables) res.variables = app.getVariables();
                } catch(e) {}
                try {
                    // Check scene objects
                    if (app._scene) {
                        res.sceneChildren = app._scene.children.map(c => ({ name: c.name, type: c.type }));
                    }
                } catch(e) {}
                return res;
            }""")
            print("\nScene Info:", scene_info)

            # Take screenshot of the loaded model
            page.screenshot(path='audit_evidence/spline_runtime_test.png')
            print("\nScreenshot saved to audit_evidence/spline_runtime_test.png")

        browser.close()

if __name__ == '__main__':
    test_runtime()
