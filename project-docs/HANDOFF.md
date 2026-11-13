# ConnectSphere — Engineering Handoff & Maintenance Guide

## 1. Project Overview & Structure
ConnectSphere is a full-stack DBMS academic social platform engineered to demonstrate relational database concepts (normalization, multi-table joins, cascading foreign keys, query optimization, indexing) through an intuitive social network interface.

```
ConnectSphere/
├── public/
│   ├── assets/
│   │   ├── scene.splinecode         # Local Spline 3D robot asset
│   │   └── spline_fallback.svg      # Graceful vector fallback
│   ├── design-system.css            # Reusable 3-tier CSS custom properties & component styles
│   ├── styles.css                   # Layout rules, animations, and responsive utilities
│   ├── app.js                       # Vanilla JS frontend state, DOM handlers, and API client
│   └── index.html                   # Semantic HTML5 application shell & landing page
├── project-docs/
│   ├── DESIGN_SYSTEM.md             # Complete design token & component specification
│   ├── TECHNICAL_DECISIONS.md       # Architectural decisions & design trade-offs
│   ├── PROGRESS.md                  # Milestone ledger & defect resolution log
│   └── HANDOFF.md                   # Operational runbook & maintenance guide
├── scripts/
│   ├── recon_audit.py               # Playwright automated visual audit script
│   └── functional_test.py           # Playwright end-to-end regression test script
├── audit_evidence/                  # 13 high-resolution visual QA screenshot artifacts
├── server.js                        # Express.js REST API server & MySQL connection pool
├── package.json                     # Node.js dependencies and scripts
└── README.md                        # Project introductory documentation
```

---

## 2. Quickstart Runbook

### 2.1 Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Python 3.10+ with `playwright` (optional, for running automated visual QA)
- MySQL Server 8.0+ (optional: if omitted, the application runs in client-side demonstration mode)

### 2.2 Local Installation
```bash
# Clone the repository
git clone https://github.com/Rio-Stuart/ConnectSphere.git
cd ConnectSphere

# Install Node.js dependencies
npm install --ignore-scripts

# Start the Express server
node server.js
```
The server will bind to `http://localhost:3000`.

### 2.3 Environment Variables
Configure `.env` in the root directory if connecting to a real MySQL instance:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=connectsphere
DB_PORT=3306
```

---

## 3. Running Automated Verification

### 3.1 Functional Regression Test
Verifies theme toggle, login navigation, post composer hashtag insertion, query toggle modes, analytical benchmark queries, table explorer tabs, and modal triggers:
```bash
python scripts/functional_test.py
```

### 3.2 Visual Reconnaissance Audit
Generates 13 full-resolution screenshots across all viewports and theme modes:
```bash
python scripts/recon_audit.py
```
Output screenshots will be populated in `audit_evidence/`.

---

## 4. Key Maintenance Guidelines

### 4.1 Modifying Design Tokens
All color palettes, typography scales, spacing tokens, and radii are defined in `public/design-system.css`.
- To adjust light theme colors: modify `:root { ... }`.
- To adjust dark theme colors: modify `html.dark { ... }`.
- **Never hardcode hex values** in `public/index.html` or inline scripts. Always reference semantic variables such as `var(--cs-accent)` or `var(--cs-surface-primary)`.

### 4.2 Adding New Lucide Icons
When adding new icons:
1. Insert `<i data-lucide="icon-name" class="w-4 h-4"></i>` in HTML or JavaScript template strings.
2. Ensure `refreshIcons()` is called after dynamically appending HTML to the DOM.

### 4.3 Modal Management
ConnectSphere uses native HTML `<dialog>` elements.
- Open modal: `modalElement.showModal()`.
- Close modal: `modalElement.close()`.
- All modals inherit fixed centering (`position: fixed; inset: 0; margin: auto;`) via `.cs-modal`.

---

## 5. Authentication Architecture & Verification

### 5.1 Authentication Flow & Credentials
- **Endpoint**: `POST /api/login` with payload `{"username": "<string>", "password": "<string>"}`
- **Credentials Policy**:
  - Administrator (`admin`): password `admin` (Unlocks full DBA privilege, analytical explain plans, and raw SQL console).
  - Regular Users (`aarav_tech`, `priya_travels`, `rohan_fitness`, `neha_art`, or any registered user): password `dbms`.
- **Validation**:
  - Empty or invalid types return `400 Bad Request` with descriptive JSON `{"error": "..."}`.
  - Non-existent accounts return `404 Not Found`.
  - Bad credentials return `401 Unauthorized`.
  - Database connectivity failures return `503 Service Unavailable` with friendly downtime messaging instead of raw empty 500s.
- **Node 18+ AggregateError Normalization**:
  - `server.js: runQuery()` intercepts multi-stack `AggregateError` from dual-stack IPv6/IPv4 connections, extracting root cause codes (`ECONNREFUSED`) to guarantee clean client responses.

### 5.2 Automated Authentication Suite
A dedicated 12-test comprehensive suite is available in `scripts/test_auth_suite.py`:
```bash
python scripts/test_auth_suite.py
```
Covers:
1. Admin credentials verification (`admin` / `admin` -> 200)
2. Password mismatch verification (401)
3. Non-existent account check (404)
4. Empty username validation (400)
5. Empty password validation (400)
6. Malformed JSON payload validation (400)
7. Safe error structure (no stack leaks, non-empty error message)
8. End-to-end UI login flow and active session establishment
9. Navbar user handle & session storage integrity
10. End-to-end session logout flow
11. Admin login following user logout (DBA privileges unlock verification)
12. Registration of a fresh user followed immediately by authenticated login

---

## 6. Security & Production Checklist
- [x] Zero hardcoded credentials or API tokens in client scripts.
- [x] `escapeHtml()` sanitization applied to user input, comments, and posts before DOM insertion.
- [x] Prepared SQL parameter binding used on all server endpoints.
- [x] Toast notification deduplication preventing denial-of-service style visual spam.
- [x] Strict WCAG 2.2 AA accessibility contrast verified across all themes.
- [x] Safe database error shielding ensuring zero internal connection or SQL stack traces leak to HTTP clients.
