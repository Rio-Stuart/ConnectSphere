import time
from playwright.sync_api import sync_playwright

def inspect_spline():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless=True
        )
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        
        console_messages = []
        page.on('console', lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: console_messages.append(f"[PAGEERROR] {err}"))

        print("Navigating to http://localhost:3000...")
        page.goto('http://localhost:3000', wait_until='domcontentloaded')
        
        # Wait up to 10 seconds for spline-viewer or canvas to appear
        for i in range(10):
            time.sleep(1)
            status = page.evaluate("""() => {
                const viewer = document.querySelector('spline-viewer');
                if (!viewer) return { found: false };
                const shadow = viewer.shadowRoot;
                const canvas = shadow ? shadow.querySelector('canvas') : null;
                const splineApp = viewer._spline || viewer.spline;
                return {
                    found: true,
                    hasShadow: Boolean(shadow),
                    hasCanvas: Boolean(canvas),
                    hasSplineApp: Boolean(splineApp),
                    canvasWidth: canvas ? canvas.width : 0,
                    canvasHeight: canvas ? canvas.height : 0,
                    isLoading: viewer.getAttribute('loading') || false
                };
            }""")
            print(f"Sec {i+1}: {status}")
            if status.get('hasCanvas'):
                break

        # Check console logs
        print("\nConsole logs during load:")
        for log in console_messages:
            print("  ", log)

        # Inspect spline-viewer internals if available
        viewer_info = page.evaluate("""() => {
            const viewer = document.querySelector('spline-viewer');
            if (!viewer) return null;
            const res = {
                attributes: Array.from(viewer.attributes).map(a => `${a.name}="${a.value}"`),
                shadowHTML: viewer.shadowRoot ? viewer.shadowRoot.innerHTML.slice(0, 300) : null
            };
            // Look for spline runtime app
            for (let k in viewer) {
                if (k.toLowerCase().includes('spline') || k.toLowerCase().includes('app')) {
                    res[k] = typeof viewer[k];
                }
            }
            return res;
        }""")
        print("\nViewer info:", viewer_info)

        # Take screenshot of the hero section
        hero = page.locator('.landing-hero')
        if hero.count() > 0:
            hero.screenshot(path='audit_evidence/spline_initial_hero.png')
            print("\nSaved screenshot to audit_evidence/spline_initial_hero.png")

        browser.close()

if __name__ == '__main__':
    inspect_spline()
