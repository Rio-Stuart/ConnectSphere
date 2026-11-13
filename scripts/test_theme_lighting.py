import time
from playwright.sync_api import sync_playwright

def test_theme_lighting():
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

        # 1. Dark Mode: set body background to dark, set canvas transparent
        page.evaluate("""() => {
            document.body.style.background = '#0A0A0C';
            window.splineApp.setBackgroundColor('transparent');
        }""")
        time.sleep(0.5)
        # Move mouse near center to look forward
        page.mouse.move(500, 400)
        time.sleep(0.5)
        page.screenshot(path='audit_evidence/spline_dark_mode.png')

        # 2. Light Mode: set body background to light (#FAFAFA), set canvas transparent
        page.evaluate("""() => {
            document.body.style.background = '#FAFAFA';
            document.querySelector('h2').style.color = '#09090B';
            document.getElementById('status').style.color = '#52525B';
            document.getElementById('container').style.borderColor = 'rgba(0,0,0,0.1)';
            window.splineApp.setBackgroundColor('transparent');
        }""")
        time.sleep(0.5)
        page.mouse.move(500, 400)
        time.sleep(0.5)
        page.screenshot(path='audit_evidence/spline_light_mode.png')

        print("Captured audit_evidence/spline_dark_mode.png and audit_evidence/spline_light_mode.png")
        browser.close()

if __name__ == '__main__':
    test_theme_lighting()
