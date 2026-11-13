import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "audit_evidence"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            headless=True
        )

        # ── 1. Desktop 1440x900 ──
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.goto('http://localhost:3000', wait_until='domcontentloaded', timeout=15000)

        # 1a. Landing Page Dark
        page.evaluate("applyTheme('dark'); showLandingPage();")
        time.sleep(0.5)
        page.screenshot(path=f"{SCREENSHOT_DIR}/01_landing_dark_1440.png", full_page=True)

        # 1b. Landing Page Light
        page.evaluate("applyTheme('light');")
        time.sleep(0.5)
        page.screenshot(path=f"{SCREENSHOT_DIR}/02_landing_light_1440.png", full_page=True)

        # 1c. Login Screen Light
        page.evaluate("showLoginFromLanding();")
        time.sleep(0.4)
        page.screenshot(path=f"{SCREENSHOT_DIR}/03_login_light.png")

        # 1d. Login Screen Dark
        page.evaluate("applyTheme('dark');")
        time.sleep(0.4)
        page.screenshot(path=f"{SCREENSHOT_DIR}/04_login_dark.png")

        # 1e. App Screen with Session (Simulated user Alex)
        page.evaluate("""() => {
            users = [
                { user_id: 1, username: 'alex_dev', email: 'alex@example.com', bio: 'Senior Database Architect & Systems Engineer', is_admin: 1 },
                { user_id: 2, username: 'sarah_data', email: 'sarah@example.com', bio: 'Data Science Researcher', is_admin: 0 },
                { user_id: 3, username: 'elena_sql', email: 'elena@example.com', bio: 'RDBMS Optimization Specialist', is_admin: 0 }
            ];
            activeUserId = 1;
            activeUser = users[0];
            isAdmin = true;
            enterAppSession(1);
        }""")
        time.sleep(0.5)

        # Populate a sample post in postsStream to audit post card and comments
        page.evaluate("""() => {
            const stream = document.getElementById('postsStream');
            stream.innerHTML = `
                <article class="cs-card p-4 sm:p-5 transition-all space-y-3 relative" data-post-id="101">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="cs-avatar cs-avatar-md cs-avatar-1">A</div>
                      <div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="font-bold text-sm text-[var(--cs-text-primary)]">@alex_dev</span>
                          <span class="query-detail cs-badge cs-badge-accent font-mono">user_id: 1</span>
                        </div>
                        <div class="flex items-center gap-2 text-[11px] text-[var(--cs-text-tertiary)] font-mono mt-0.5">
                          <span>10m ago</span>
                          <span class="query-detail">•</span>
                          <span class="query-detail">PK post_id: #101</span>
                        </div>
                      </div>
                    </div>
                    <button class="cs-btn cs-btn-secondary cs-btn-sm">
                      <i data-lucide="user-check" class="w-3.5 h-3.5"></i>
                      <span>Following</span>
                    </button>
                  </div>
                  <p class="text-[14px] text-[var(--cs-text-primary)] leading-relaxed font-sans">
                    Exploring normalized BCNF schema design and composite indexing in ConnectSphere v2.2. Query execution times dropped by 74%! <span class="cs-hashtag font-medium">#dbms</span> <span class="cs-hashtag font-medium">#sql</span>
                  </p>
                  <div class="query-detail bg-[var(--cs-surface-secondary)] rounded-lg px-3 py-1.5 border border-[var(--cs-border-secondary)] font-mono text-[10px] text-[var(--cs-text-secondary)] flex items-center justify-between flex-wrap gap-1">
                    <span class="text-[var(--cs-accent)] flex items-center gap-1">
                      <i data-lucide="git-branch" class="w-3 h-3"></i>
                      Relational Link: <code class="text-[var(--cs-warning)] font-semibold">Posts.user_id (1)</code> ➔ <code class="text-[var(--cs-info)] font-semibold">Users.user_id (1)</code>
                    </span>
                    <span class="cs-badge cs-badge-accent">ON DELETE CASCADE</span>
                  </div>
                  <div class="flex items-center justify-between pt-2 border-t border-[var(--cs-border-secondary)] text-xs">
                    <div class="flex items-center gap-2">
                      <button class="cs-btn cs-btn-sm text-[var(--cs-error)] bg-[var(--cs-error-light)]">
                        <i data-lucide="heart" class="w-4 h-4 fill-current"></i>
                        <span>18</span>
                      </button>
                      <button class="cs-btn cs-btn-ghost cs-btn-sm text-[var(--cs-text-secondary)]">
                        <i data-lucide="message-circle" class="w-4 h-4"></i>
                        <span>3</span>
                      </button>
                    </div>
                  </div>
                  <!-- Comments Drawer Open -->
                  <div id="comments-101" class="pt-3 border-t border-[var(--cs-border-secondary)] space-y-3">
                    <div class="flex items-center gap-2">
                      <input type="text" class="cs-input flex-1 text-xs" placeholder="Write a comment..." value="Great benchmark results!" />
                      <button class="cs-btn cs-btn-primary cs-btn-sm">
                        <i data-lucide="send" class="w-3 h-3"></i>
                        <span>Comment</span>
                      </button>
                    </div>
                    <div class="space-y-2 pt-1">
                      <div class="flex items-start gap-2.5 bg-[var(--cs-surface-secondary)] rounded-lg p-2.5 border border-[var(--cs-border-secondary)]">
                        <div class="cs-avatar cs-avatar-sm cs-avatar-2">S</div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-xs text-[var(--cs-accent)]">@sarah_data</span>
                            <span class="text-[10px] text-[var(--cs-text-tertiary)] font-mono">5m ago</span>
                          </div>
                          <p class="text-[var(--cs-text-primary)] text-xs mt-1">Which buffer pool size did you use for the benchmark?</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
            `;
            refreshIcons();
        }""")

        # Log some queries in the SQL Logger console
        page.evaluate("""() => {
            logSql("SELECT p.*, u.username FROM Posts p JOIN Users u ON p.user_id = u.user_id ORDER BY p.created_at DESC LIMIT 20;", []);
            logSql("INSERT INTO Likes (post_id, user_id) VALUES (?, ?);", [101, 1]);
            refreshIcons();
        }""")

        time.sleep(0.5)
        # 1f. App Screen Dark with Split View & Logged Queries
        page.screenshot(path=f"{SCREENSHOT_DIR}/05_app_dark_split.png", full_page=True)

        # 1g. App Screen Light
        page.evaluate("applyTheme('light');")
        time.sleep(0.5)
        page.screenshot(path=f"{SCREENSHOT_DIR}/06_app_light_split.png", full_page=True)

        # 1h. User Modal Light
        page.evaluate("openModal();")
        time.sleep(0.4)
        page.screenshot(path=f"{SCREENSHOT_DIR}/07_user_modal_light.png")
        page.evaluate("closeModal(); applyTheme('dark');")

        # 1i. User Profile Modal Dark
        page.evaluate("""() => {
            const modal = document.getElementById('profileModal');
            document.getElementById('modalProfileTitle').textContent = '@alex_dev';
            document.getElementById('modalProfileEmail').textContent = 'alex@example.com • user_id: 1';
            document.getElementById('modalProfileBio').textContent = 'Senior Database Architect & Systems Engineer. Passionate about query optimization, normalization, and distributed storage engines.';
            document.getElementById('modalProfilePostsCount').textContent = '24';
            document.getElementById('modalProfileFollowersCount').textContent = '142';
            document.getElementById('modalProfileFollowingCount').textContent = '38';
            document.getElementById('modalProfileSqlCode').textContent = 'SELECT * FROM Users WHERE user_id = 1;\\n\\nSELECT * FROM Posts WHERE user_id = 1 ORDER BY created_at DESC;';
            modal.showModal();
            refreshIcons();
        }""")
        time.sleep(0.5)
        page.screenshot(path=f"{SCREENSHOT_DIR}/08_profile_modal_dark.png")
        page.evaluate("closeProfileModal();")

        # ── 2. Viewport Audit: Mobile (360px, 390px), Tablet (768px), Desktop (1024px, 1920px) ──
        page.evaluate("showLandingPage(); applyTheme('dark');")
        for width, name in [
            (360, "mobile_360"),
            (390, "mobile_390"),
            (768, "tablet_768"),
            (1024, "desktop_1024"),
            (1920, "wide_1920")
        ]:
            page.set_viewport_size({'width': width, 'height': 800})
            time.sleep(0.3)
            page.screenshot(path=f"{SCREENSHOT_DIR}/viewport_{name}_landing.png")

        print("Visual reconnaissance completed successfully.")
        browser.close()

if __name__ == '__main__':
    audit()
