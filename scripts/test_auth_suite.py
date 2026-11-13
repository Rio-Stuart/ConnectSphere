import sys
import time
from playwright.sync_api import sync_playwright

def run_auth_suite():
    errors = []
    print("==================================================")
    print(" CONNECTSPHERE AUTHENTICATION SUITE (12 TESTS)")
    print("==================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless=True
        )
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        page.on('pageerror', lambda err: errors.append(f"Uncaught Exception: {err}"))

        print("\nNavigating to ConnectSphere...")
        page.goto('http://localhost:3000', wait_until='domcontentloaded')
        time.sleep(1)

        # -------------------------------------------------------------
        # Test 1: Existing Admin user with correct credentials
        # -------------------------------------------------------------
        print("\n[Test 1] Existing Admin with correct credentials ('admin' / 'admin')...")
        res1 = page.evaluate("""async () => {
            const r = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'admin' })
            });
            return { status: r.status, data: await r.json() };
        }""")
        print(f"   Status: {res1['status']}, User: {res1['data'].get('data', {}).get('username')}, is_admin: {res1['data'].get('data', {}).get('is_admin')}")
        assert res1['status'] == 200, f"Expected 200, got {res1['status']}"
        assert res1['data']['data']['username'] == 'admin', "Expected username admin"
        assert res1['data']['data']['is_admin'] is True, "Expected is_admin true"

        # -------------------------------------------------------------
        # Test 2: Existing user with incorrect password
        # -------------------------------------------------------------
        print("\n[Test 2] Existing user with incorrect password...")
        res2 = page.evaluate("""async () => {
            const r = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'wrongpassword' })
            });
            return { status: r.status, data: await r.json() };
        }""")
        print(f"   Status: {res2['status']}, Error: {res2['data'].get('error')}")
        assert res2['status'] == 401, f"Expected 401, got {res2['status']}"
        assert 'Incorrect password' in res2['data']['error'], "Expected incorrect password message"

        # -------------------------------------------------------------
        # Test 3: Nonexistent user
        # -------------------------------------------------------------
        print("\n[Test 3] Nonexistent user lookup...")
        res3 = page.evaluate("""async () => {
            const r = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'nonexistent_user_99999', password: 'dbms' })
            });
            return { status: r.status, data: await r.json() };
        }""")
        print(f"   Status: {res3['status']}, Error: {res3['data'].get('error')}")
        assert res3['status'] == 404, f"Expected 404, got {res3['status']}"
        assert 'not found' in res3['data']['error'].lower(), "Expected not found error"

        # -------------------------------------------------------------
        # Test 4: Empty username
        # -------------------------------------------------------------
        print("\n[Test 4] Empty username validation...")
        res4 = page.evaluate("""async () => {
            const r = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: '   ', password: 'dbms' })
            });
            return { status: r.status, data: await r.json() };
        }""")
        print(f"   Status: {res4['status']}, Error: {res4['data'].get('error')}")
        assert res4['status'] == 400, f"Expected 400, got {res4['status']}"
        assert 'Username is required' in res4['data']['error']

        # -------------------------------------------------------------
        # Test 5: Empty password
        # -------------------------------------------------------------
        print("\n[Test 5] Empty password validation...")
        res5 = page.evaluate("""async () => {
            const r = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'aarav_tech', password: '' })
            });
            return { status: r.status, data: await r.json() };
        }""")
        print(f"   Status: {res5['status']}, Error: {res5['data'].get('error')}")
        assert res5['status'] == 400, f"Expected 400, got {res5['status']}"
        assert 'Password is required' in res5['data']['error']

        # -------------------------------------------------------------
        # Test 6: Invalid request payload
        # -------------------------------------------------------------
        print("\n[Test 6] Invalid request payload...")
        res6 = page.evaluate("""async () => {
            const r = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            return { status: r.status, data: await r.json() };
        }""")
        print(f"   Status: {res6['status']}, Error: {res6['data'].get('error')}")
        assert res6['status'] == 400, f"Expected 400, got {res6['status']}"

        # -------------------------------------------------------------
        # Test 7: Safe error structure (No stack traces or empty strings)
        # -------------------------------------------------------------
        print("\n[Test 7] Safe error structure verification...")
        assert 'stack' not in res2['data'], "Stack trace should never be exposed in response"
        assert len(res2['data'].get('error', '')) > 0, "Error message must never be empty"

        # -------------------------------------------------------------
        # Test 8 & 9: Full UI Login Flow & Session Creation
        # -------------------------------------------------------------
        print("\n[Test 8 & 9] UI Login Flow, Navigation & Session Creation...")
        page.evaluate("showLoginFromLanding()")
        time.sleep(0.3)
        # Fill credentials in UI form and submit
        page.evaluate("""() => {
            document.getElementById('loginUsername').value = 'aarav_tech';
            document.getElementById('loginPassword').value = 'dbms';
            handleLoginSubmit(new Event('submit'));
        }""")
        time.sleep(1.5)

        # Verify navigation to app screen
        app_visible = page.evaluate("!document.getElementById('appScreen').classList.contains('hidden')")
        landing_hidden = page.evaluate("document.getElementById('landingPage').classList.contains('hidden')")
        session_user = page.evaluate("sessionStorage.getItem('connectsphere_active_user')")
        active_handle = page.evaluate("document.getElementById('navUserHandle').textContent")

        print(f"   App Screen Visible: {app_visible}")
        print(f"   Session Storage User: {session_user}")
        print(f"   Navbar User Handle: {active_handle}")

        assert app_visible and landing_hidden, "App screen should be visible and landing hidden"
        assert session_user == '1', f"Expected active user 1 in sessionStorage, got {session_user}"
        assert active_handle == '@aarav_tech', f"Expected @aarav_tech, got {active_handle}"

        # -------------------------------------------------------------
        # Test 10: Logout Flow
        # -------------------------------------------------------------
        print("\n[Test 10] Logout Flow...")
        page.evaluate("handleLogout()")
        time.sleep(0.5)

        landing_visible = page.evaluate("!document.getElementById('landingPage').classList.contains('hidden')")
        app_hidden = page.evaluate("document.getElementById('appScreen').classList.contains('hidden')")
        session_cleared = page.evaluate("sessionStorage.getItem('connectsphere_active_user') === null")

        print(f"   Landing Visible: {landing_visible}")
        print(f"   Session Cleared: {session_cleared}")
        assert landing_visible and app_hidden, "Should return to landing page"
        assert session_cleared, "Session storage should be cleared on logout"

        # -------------------------------------------------------------
        # Test 11: Login after Logout
        # -------------------------------------------------------------
        print("\n[Test 11] Login after Logout...")
        page.evaluate("showLoginFromLanding()")
        time.sleep(0.3)
        page.evaluate("""() => {
            document.getElementById('loginUsername').value = 'admin';
            document.getElementById('loginPassword').value = 'admin';
            handleLoginSubmit(new Event('submit'));
        }""")
        time.sleep(1.5)

        admin_session = page.evaluate("sessionStorage.getItem('connectsphere_active_user')")
        admin_handle = page.evaluate("document.getElementById('navUserHandle').textContent")
        is_admin_mode = page.evaluate("document.body.classList.contains('is-admin')")

        print(f"   Admin Session ID: {admin_session}")
        print(f"   Admin Handle: {admin_handle}")
        print(f"   Admin Mode Class: {is_admin_mode}")

        assert admin_session == '5', f"Expected admin user_id 5, got {admin_session}"
        assert admin_handle == '@admin', f"Expected @admin, got {admin_handle}"
        assert is_admin_mode, "Admin privileges should be unlocked"

        # -------------------------------------------------------------
        # Test 12: Registration followed by Login
        # -------------------------------------------------------------
        print("\n[Test 12] Registration followed by Login...")
        new_username = f"scholar_{int(time.time())}"
        new_email = f"{new_username}@university.edu"

        reg_result = page.evaluate(f"""async () => {{
            const res = await fetch('/api/users', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{
                    username: '{new_username}',
                    email: '{new_email}',
                    bio: 'Academic DBMS Researcher',
                    avatar: '🎓'
                }})
            }});
            return {{ status: res.status, data: await res.json() }};
        }}""")
        print(f"   Registration Status: {reg_result['status']}, User ID: {reg_result['data']['data']['user_id']}")
        assert reg_result['status'] == 201, f"Expected 201 Created, got {reg_result['status']}"

        # Login with newly registered user
        login_result = page.evaluate(f"""async () => {{
            const res = await fetch('/api/login', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{
                    username: '{new_username}',
                    password: 'dbms'
                }})
            }});
            return {{ status: res.status, data: await res.json() }};
        }}""")
        print(f"   Login with New User Status: {login_result['status']}, Username: {login_result['data']['data']['username']}")
        assert login_result['status'] == 200, f"Expected 200 OK, got {login_result['status']}"
        assert login_result['data']['data']['username'] == new_username

        # Take screenshot of active verified session
        page.screenshot(path='audit_evidence/login_success_verified.png')
        print("\nScreenshot saved to audit_evidence/login_success_verified.png")

        browser.close()

    print("\n==================================================")
    if errors:
        print(f"FAILED with {len(errors)} uncaught errors:")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    else:
        print("ALL 12 AUTHENTICATION SUITE TESTS PASSED (0 ERRORS).")
        print("==================================================")

if __name__ == '__main__':
    run_auth_suite()
