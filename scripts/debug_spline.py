import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless=True,
        args=['--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
    )
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.on('console', lambda m: print(f"CONSOLE [{m.type}]: {m.text}", flush=True))
    page.on('pageerror', lambda e: print(f"PAGEERROR: {e}", flush=True))

    page.goto('http://localhost:3000', wait_until='domcontentloaded')
    time.sleep(3)

    state = page.evaluate("""() => {
        return {
            splineLoaded: window.splineLoaded,
            splineApp: Boolean(window.splineApp),
            canvas: Boolean(document.getElementById('splineCanvas')),
            container: Boolean(document.getElementById('splineContainer')),
            loader: Boolean(document.getElementById('splineLoader'))
        };
    }""")
    print("State:", state, flush=True)
    browser.close()
