import time
import sys
from playwright.sync_api import sync_playwright

def run_tests():
    errors = []
    console_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless=True
        )
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        # Track uncaught errors
        page.on('pageerror', lambda err: errors.append(f"Uncaught Exception: {err}"))
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        print("1. Testing Landing Page & Theme Switching...")
        page.goto('http://localhost:3000', wait_until='domcontentloaded', timeout=15000)

        # Test theme toggle
        is_dark = page.evaluate("document.documentElement.classList.contains('dark')")
        page.evaluate("toggleTheme()")
        is_toggled = page.evaluate("document.documentElement.classList.contains('dark')")
        assert is_dark != is_toggled, "Theme toggle did not flip class"
        # Return to dark
        page.evaluate("applyTheme('dark')")

        print("2. Testing Login Page Transition...")
        page.evaluate("showLoginFromLanding()")
        login_visible = page.evaluate("!document.getElementById('loginScreen').classList.contains('hidden')")
        assert login_visible, "Login screen should be visible"

        print("3. Testing App Session Entry...")
        page.evaluate("""() => {
            users = [
                { user_id: 1, username: 'admin', email: 'admin@connectsphere.internal', bio: 'System Administrator & Lead DBA', is_admin: 1 },
                { user_id: 2, username: 'sarah_data', email: 'sarah@example.com', bio: 'Data Science Researcher', is_admin: 0 }
            ];
            enterAppSession(1);
        }""")
        time.sleep(0.3)
        app_visible = page.evaluate("!document.getElementById('appScreen').classList.contains('hidden')")
        assert app_visible, "App screen should be visible"

        # Verify active user card is immediately populated
        user_handle = page.evaluate("document.getElementById('activeUserName').textContent")
        assert user_handle == '@admin', f"Expected @admin, got {user_handle}"

        print("4. Testing Post Composer & Tag Insertion...")
        page.evaluate("insertTag('#sql')")
        post_content = page.evaluate("document.getElementById('postInput').value")
        assert '#sql' in post_content, f"Hashtag '#sql' should be in post content, got {post_content}"

        # Check char counter
        char_count = page.evaluate("document.getElementById('postCharCount').textContent")
        assert char_count != '0/500', f"Char count should be updated from 0/500, got {char_count}"

        print("5. Testing Layout Switcher Buttons...")
        page.evaluate("setLayout('feed')")
        inspector_hidden = page.evaluate("document.getElementById('colInspector').classList.contains('hidden')")
        assert inspector_hidden, "Inspector column should be hidden in feed mode"

        page.evaluate("setLayout('split')")
        inspector_visible = page.evaluate("!document.getElementById('colInspector').classList.contains('hidden')")
        assert inspector_visible, "Inspector column should be visible in split mode"

        print("6. Testing Query Toggle Button...")
        initial_label = page.evaluate("document.getElementById('queryViewLabel').textContent")
        page.evaluate("toggleQueryView()")
        new_label = page.evaluate("document.getElementById('queryViewLabel').textContent")
        assert initial_label != new_label, f"Label should have toggled (was {initial_label}, now {new_label})"

        print("7. Testing Analytical Query Execution...")
        page.evaluate("runAnalyticalQuery(1)")
        analytics_visible = page.evaluate("!document.getElementById('analyticsResult').classList.contains('hidden')")
        assert analytics_visible, "Analytics result panel should be visible after running query"
        page.evaluate("closeAnalyticsResult()")

        print("8. Testing Table Tabs...")
        for tab in ['users', 'posts', 'comments', 'likes', 'followers']:
            page.evaluate(f"setTableTab('{tab}')")
            active_tab = page.evaluate("currentTableTab")
            assert active_tab == tab, f"Expected {tab}, got {active_tab}"

        print("9. Testing Modals...")
        # User Insert Modal
        page.evaluate("openModal()")
        modal_open = page.evaluate("document.getElementById('userModal').open")
        assert modal_open, "User modal should be open"
        page.evaluate("closeModal()")
        modal_closed = page.evaluate("!document.getElementById('userModal').open")
        assert modal_closed, "User modal should be closed"

        # Profile Modal
        page.evaluate("""() => {
            const modal = document.getElementById('profileModal');
            document.getElementById('modalProfileTitle').textContent = '@sarah_data';
            document.getElementById('modalProfileEmail').textContent = 'sarah@example.com';
            modal.showModal();
        }""")
        profile_open = page.evaluate("document.getElementById('profileModal').open")
        assert profile_open, "Profile modal should be open"
        page.evaluate("closeProfileModal()")

        # Toast Deduplication Test
        print("10. Testing Toast Deduplication...")
        page.evaluate("document.getElementById('toastContainer').innerHTML = ''")
        page.evaluate("""() => {
            showToast('Test Toast Notification', 'info');
            showToast('Test Toast Notification', 'info');
            showToast('Test Toast Notification', 'info');
        }""")
        toasts_count = page.evaluate("document.querySelectorAll('#toastContainer .cs-toast').length")
        assert toasts_count == 1, f"Expected exactly 1 toast due to deduplication, got {toasts_count}"

        browser.close()

    print("\n--- TEST SUMMARY ---")
    if errors:
        print(f"FAILED with {len(errors)} uncaught exceptions:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("ALL FUNCTIONAL REGRESSION CHECKS PASSED (0 uncaught errors).")

if __name__ == '__main__':
    run_tests()
