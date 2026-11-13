# ConnectSphere — Architecture & Technical Decisions

## Overview
This document records the foundational architectural decisions, rationale, alternatives considered, and verification evidence for the UI overhaul and quality assurance of the ConnectSphere platform.

---

### Decision 1: Three-Tier CSS Custom Property Design Token Architecture
- **Context**: The existing styles relied on inconsistent inline hex values, ad-hoc Tailwind arbitrary values (`text-[#4f46e5]`, `bg-[#18181b]`), and disconnected light/dark mode overrides.
- **Decision**: Established a single, unified token architecture in `public/design-system.css` using three semantic tiers:
  1. *Primitives*: Core color ramps and physics values.
  2. *Semantics*: Contextual bindings (`--cs-bg-primary`, `--cs-surface-secondary`, `--cs-text-primary`, `--cs-accent`).
  3. *Components*: Tokenized component specs (`.cs-btn`, `.cs-card`, `.cs-toast`, `.cs-modal`).
- **Rationale**: Clean token architecture enables instant, zero-flicker light/dark mode transitions, eliminates style duplication, and provides a single source of truth for contrast ratios.
- **Status**: Implemented & verified.

---

### Decision 2: Standardized Lucide SVG Icon System
- **Context**: The application previously mixed emoji text characters (e.g., 🔍, 💬, ❤️, 🚀) with varying SVG snippets, causing cross-platform rendering discrepancies (emojis render with different glyphs and alignments on Windows vs macOS vs Android).
- **Decision**: Completely transitioned to Lucide icons via `<i data-lucide="..."></i>` with a global `refreshIcons()` helper that reliably hydrates dynamic template strings and AJAX responses.
- **Rationale**: Lucide icons provide unified 1.75px stroke weights, consistent optical centers, vector scalability, and accessible `aria-hidden="true"` defaults.
- **Status**: Implemented & verified across all pages, feeds, comments, modals, and terminals.

---

### Decision 3: Programmatic Spline 3D Runtime Integration & Real Interactivity
- **Context**: The user provided a local Spline 3D robot mascot scene (`scene.splinecode`). The initial drop-in `<spline-viewer>` web component suffered from library version mismatch warnings (schema version 135 downgraded to 115) and encapsulated the `<canvas>` in a closed Shadow DOM, preventing programmatic background synchronization, theme-based lighting adjustments, and global pointer tracking.
- **Decision**:
  - Upgraded to modern `@splinetool/runtime@2.0.183` dynamically imported in `public/app.js` and mounted onto a native `<canvas id="splineCanvas">`.
  - Configured `splineApp.setBackgroundColor('transparent')` to guarantee 100% seamless blending with both light (`#FAFAFA`) and dark (`#0A0A0C`) surfaces without rectangular letterboxing.
  - Activated `splineApp.setGlobalEvents(true)`: the robot's head (`Cabeza`) actively follows the user's cursor across the entire page in real time via its native `lookAt` event.
  - Connected the 3D scene to the application's theme system (`syncSplineTheme`): dynamically modulates `HemisphereLight` intensity (`2.35` in dark mode, `3.10` in light mode) without reloading the page or recreating the WebGL runtime.
  - Added click and touch interactions with speech bubble greeting feedback (`"🤖 ConnectSphere DBMS Mascot ready!"`).
  - Implemented graceful loading spinner overlay and CSS canvas fallback for devices without WebGL.
  - Checked `prefers-reduced-motion` to halt cursor tracking for accessibility compliance.
- **Rationale**: Elevates the landing page into a genuinely interactive 3D product showcase while maintaining zero bundle build steps, clean theme transitions, and full mobile responsiveness.
- **Status**: Implemented & verified across Light/Dark modes, mouse tracking, and touch viewports.

---

### Decision 4: Vanilla JavaScript Architectural Preservation
- **Context**: The project was authored in vanilla ECMAScript with standard DOM manipulation and Express.js REST endpoints.
- **Decision**: Strictly preserved vanilla JavaScript architecture. No reactive frameworks (React, Vue, Svelte) or build-step dependencies (Webpack, Vite) were introduced.
- **Rationale**: Introducing a frontend framework would break the existing academic demonstration purpose, inflate bundle size, require transpilation infrastructure, and risk backend API contract violations. The application now runs natively directly out of the `public/` directory.
- **Status**: Implemented & verified.

---

### Decision 5: Native HTML `<dialog>` Overhaul & Centering Fix
- **Context**: The native HTML `<dialog>` elements (`#userModal`, `#profileModal`, `#mediaModal`) exhibited alignment jitter and non-centering in Chromium viewports when rendered inside container wrappers.
- **Decision**: Added `position: fixed; inset: 0; margin: auto;` alongside `overscroll-behavior: contain;` and `display: flex; flex-direction: column;` to `dialog.cs-modal`.
- **Rationale**: Chromium's top-layer implementation for `<dialog>` requires explicit fixed inset positioning to guarantee dead-center placement across full-screen viewports, regardless of parent DOM hierarchy.
- **Status**: Implemented & verified.

---

### Decision 6: Separation of Modal Avatar from Scrollable Viewport
- **Context**: In `#profileModal`, applying a negative margin (`-mt-8`) on the avatar container inside an `overflow-y: auto` scroll container resulted in the avatar's top half being clipped against the scroll boundary.
- **Decision**: Extracted the avatar and profile follow action into a dedicated subheader with `relative z-10 -mt-8 px-5 shrink-0`, placed directly between the fixed banner and the scrollable body container.
- **Rationale**: CSS overflow clipping strictly clips child elements at the scroll boundary. Placing the overlapping avatar in a non-scrollable header allows it to overlap the banner cleanly while the content beneath scrolls independently.
- **Status**: Implemented & verified.

---

### Decision 7: Responsive Mobile & Tablet Hardening
- **Context**: At 360px viewport widths, the hero headline text cut off, CTA buttons overflowed horizontally, and at 768px tablet widths, desktop navigation links crowded the header.
- **Decision**:
  - Changed header navigation links from `hidden md:inline` to `hidden lg:inline`.
  - Refactored hero headline typography to `text-2xl sm:text-4xl lg:text-6xl break-words`.
  - Configured hero CTAs to stack vertically on mobile (`flex flex-col sm:flex-row items-stretch sm:items-center`).
- **Rationale**: Prevents horizontal scrollbars, eliminates text truncation, and maintains a touch-friendly 44px minimum tap target on mobile screens.
- **Status**: Implemented & verified.

---

### Decision 8: Toast Deduplication & Silent Background Auto-Sync
- **Context**: When running locally without active database connections or when errors occur, background polling every 3.5s triggered rapid-fire error toast popups, obscuring the UI.
- **Decision**:
  - Implemented an in-memory toast deduplication map in `showToast()` with a 3,000ms debounce threshold.
  - Passed `silent = true` down through `loadTableData()` to the underlying `api()` helper during background polling intervals.
- **Rationale**: Background sync failures should not disrupt the user's active workflow with repetitive visual alerts. Only explicit user actions surface visible error notifications.
- **Status**: Implemented & verified.

---

### Decision 9: Action Button Visual Hierarchy
- **Context**: In the administrative view, both "Hide Queries" and "INSERT User" used identical `.cs-btn-primary` styling, creating competing visual weight in the header.
- **Decision**: Restyled the active state of `#btnToggleQueryView` as `.cs-btn-secondary` with an accent border and text, reserving `.cs-btn-primary` exclusively for the primary call-to-action ("INSERT User").
- **Rationale**: Preserves clear visual hierarchy and guides user attention to actionable entry points.
- **Status**: Implemented & verified.
