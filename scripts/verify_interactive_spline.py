import time
import sys
from playwright.sync_api import sync_playwright

def verify_spline():
    errors = []
    console_logs = []

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
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        page.on('pageerror', lambda err: errors.append(f"Uncaught: {err}"))
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        print("1. Loading http://localhost:3000...")
        page.goto('http://localhost:3000', wait_until='domcontentloaded')

        # Wait for Spline 3D Application to load
        print("2. Waiting for Spline 3D Application to initialize...")
        loaded = False
        for i in range(15):
            time.sleep(1)
            is_ready = page.evaluate("window.splineLoaded === true")
            if is_ready:
                loaded = True
                print(f"   -> Spline loaded successfully in {i+1}s!")
                break

        assert loaded, "Spline failed to initialize within 15 seconds"
        time.sleep(0.6)

        # Check canvas dimensions and opacity
        canvas_info = page.evaluate("""() => {
            const canvas = document.getElementById('splineCanvas');
            const rect = canvas.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                opacity: window.getComputedStyle(canvas).opacity
            };
        }""")
        print("3. Canvas Info:", canvas_info)
        assert canvas_info['width'] > 0 and canvas_info['height'] > 0, "Canvas should have non-zero dimensions"
        assert float(canvas_info['opacity']) > 0.8, "Canvas should be visible (opacity ~ 1)"

        # 4. Verify Dark Mode Rendering & Screenshot
        print("4. Testing Dark Mode Rendering...")
        page.evaluate("applyTheme('dark')")
        time.sleep(0.5)
        # Move mouse near center
        page.mouse.move(720, 450)
        time.sleep(0.5)
        hero = page.locator('.landing-hero')
        hero.screenshot(path='audit_evidence/spline_interactive_hero_dark.png')
        print("   -> Captured audit_evidence/spline_interactive_hero_dark.png")

        # 5. Verify Light Mode Rendering & Theme Sync
        print("5. Testing Theme Toggle to Light Mode...")
        page.evaluate("toggleTheme()")
        time.sleep(0.5)
        theme_is_light = page.evaluate("document.documentElement.classList.contains('light')")
        assert theme_is_light, "Theme should be light after toggle"
        hero.screenshot(path='audit_evidence/spline_interactive_hero_light.png')
        print("   -> Captured audit_evidence/spline_interactive_hero_light.png")

        # 6. Verify Cursor Following Interactivity (LookAt event on Cabeza)
        print("6. Testing Cursor Following Interactivity (Top-Left vs Bottom-Right)...")
        # Move cursor to top-left of page (100, 100)
        page.mouse.move(100, 100)
        time.sleep(0.5)
        rot_tl = page.evaluate("""() => {
            const head = window.splineApp.findObjectByName('Cabeza');
            return head ? { x: head.rotation.x, y: head.rotation.y, z: head.rotation.z } : null;
        }""")
        print("   -> Head rotation at (100, 100):", rot_tl)

        # Move cursor to bottom-right (1300, 800)
        page.mouse.move(1300, 800)
        time.sleep(0.5)
        rot_br = page.evaluate("""() => {
            const head = window.splineApp.findObjectByName('Cabeza');
            return head ? { x: head.rotation.x, y: head.rotation.y, z: head.rotation.z } : null;
        }""")
        print("   -> Head rotation at (1300, 800):", rot_br)

        assert rot_tl is not None and rot_br is not None, "Head object 'Cabeza' must exist"
        # Verify that rotation coordinates actually changed in response to cursor position
        assert rot_tl['x'] != rot_br['x'] or rot_tl['y'] != rot_br['y'], "Robot head should rotate as cursor moves"

        # 7. Test Click Interaction on Canvas (Interactive greeting bubble)
        print("7. Testing Click Interaction on 3D Canvas...")
        canvas_box = page.locator('#splineCanvas').bounding_box()
        cx = canvas_box['x'] + canvas_box['width'] / 2
        cy = canvas_box['y'] + canvas_box['height'] / 2
        page.mouse.click(cx, cy)
        time.sleep(0.4)

        bubble_visible = page.evaluate("""() => {
            const bubble = document.getElementById('splineSpeechBubble');
            const style = window.getComputedStyle(bubble);
            return style.opacity === '1';
        }""")
        bubble_text = page.evaluate("document.getElementById('splineSpeechText').textContent")
        print(f"   -> Click response: bubble visible={bubble_visible}, text='{bubble_text}'")
        assert bubble_visible, "Speech bubble should be visible after click"
        assert len(bubble_text) > 0, "Speech bubble should have greeting text"
        page.locator('#splineContainer').screenshot(path='audit_evidence/spline_click_interaction.png')
        print("   -> Captured audit_evidence/spline_click_interaction.png")

        # 8. Responsive Mobile Viewport (390px)
        print("8. Testing Responsive Mobile Viewport (390px)...")
        page.set_viewport_size({'width': 390, 'height': 800})
        time.sleep(0.5)
        mobile_box = page.locator('#splineContainer').bounding_box()
        print("   -> Mobile container width:", mobile_box['width'])
        assert mobile_box['width'] <= 390, "Spline container should not overflow 390px viewport"
        page.screenshot(path='audit_evidence/spline_mobile_390.png')
        print("   -> Captured audit_evidence/spline_mobile_390.png")

        # Return to dark mode for default state
        page.evaluate("applyTheme('dark')")

        browser.close()

    print("\n=== VERIFICATION RESULT ===")
    if errors:
        print(f"FAILED with {len(errors)} uncaught errors:")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    else:
        print("ALL INTERACTIVE SPLINE 3D REQUIREMENTS SATISFIED WITH 0 ERRORS.")

if __name__ == '__main__':
    verify_spline()
