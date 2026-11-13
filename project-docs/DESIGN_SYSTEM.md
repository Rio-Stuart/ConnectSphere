# ConnectSphere Design System Specification (v2.2)

## 1. Design Philosophy & Creative Direction
ConnectSphere bridges the gap between an **Apple-inspired consumer social interface** and a **rigorous academic DBMS laboratory**. The visual design rejects generic AI dashboards (excessive multi-stop gradients, arbitrary glassmorphism, decorative blobs) in favor of:
- **Restrained Visual Economy**: Neutral surfaces, crisp typographic hierarchies, and a single intentional accent color (`#4F46E5` Indigo).
- **Dual Personality**:
  - *Social Experience*: Warm whites, soft graphite text, balanced whitespace, and tactile cards.
  - *Academic Console*: High-contrast monospace data streams, syntax-highlighted SQL query logs, and relational schema diagrams.
- **Micro-Motion & Polish**: Hardware-accelerated CSS transitions, smooth cubic-bezier easing, and strict respect for `prefers-reduced-motion`.

---

## 2. Token Architecture & Color Palettes

ConnectSphere uses 3-tier CSS custom properties scoped to `:root` (light mode) and `html.dark` (dark mode). All surface and text combinations satisfy **WCAG 2.2 Level AA** contrast ratios (minimum 4.5:1 for standard text, 3:1 for large headers and interface controls).

### 2.1 Dark Palette (Default)
| Token | Value | Semantic Purpose |
|---|---|---|
| `--cs-bg-primary` | `#0A0A0C` | Deep void background, outer canvas |
| `--cs-bg-secondary` | `#111115` | Section background, header chrome |
| `--cs-surface-primary` | `#16161C` | Primary card background, feed items |
| `--cs-surface-secondary` | `#1C1C24` | Nested containers, table headers, input background |
| `--cs-surface-hover` | `#22222C` | Interactive hover state on neutral elements |
| `--cs-border-primary` | `rgba(255, 255, 255, 0.12)` | Focused card borders, structural dividers |
| `--cs-border-secondary` | `rgba(255, 255, 255, 0.07)` | Hairline dividers, subtle containment |
| `--cs-text-primary` | `#F4F4F6` | High-contrast body text and headlines |
| `--cs-text-secondary` | `#A1A1AA` | Secondary metadata, active labels, descriptions |
| `--cs-text-tertiary` | `#71717A` | Timestamps, placeholder text, disabled states |
| `--cs-accent` | `#6366F1` | Primary focus, active indicators, brand accent |
| `--cs-accent-hover` | `#4F46E5` | Active accent hover state |

### 2.2 Light Palette
| Token | Value | Semantic Purpose |
|---|---|---|
| `--cs-bg-primary` | `#FAFAFA` | Clean neutral white canvas |
| `--cs-bg-secondary` | `#F4F4F5` | Off-white section background |
| `--cs-surface-primary` | `#FFFFFF` | Elevated card surfaces, modal boxes |
| `--cs-surface-secondary` | `#F1F1F4` | Inset code containers, subtle controls |
| `--cs-surface-hover` | `#E4E4E7` | Interactive hover state |
| `--cs-border-primary` | `rgba(0, 0, 0, 0.12)` | Card borders, high-contrast outlines |
| `--cs-border-secondary` | `rgba(0, 0, 0, 0.06)` | Table borders, subtle gridlines |
| `--cs-text-primary` | `#09090B` | Deep graphite text |
| `--cs-text-secondary` | `#52525B` | Readable subtitles and descriptions (contrast > 5.5:1) |
| `--cs-text-tertiary` | `#71717A` | Secondary metadata, captions |
| `--cs-accent` | `#4F46E5` | Deep royal indigo accent |
| `--cs-accent-hover` | `#4338CA` | Darkened indigo hover state |

### 2.3 Semantic Status & Terminal Palette
- **Success**: `--cs-success: #10B981` (Emerald), `--cs-success-light: rgba(16, 185, 129, 0.12)`
- **Warning**: `--cs-warning: #F59E0B` (Amber), `--cs-warning-light: rgba(245, 158, 11, 0.12)`
- **Error / Danger**: `--cs-error: #EF4444` (Crimson), `--cs-error-light: rgba(239, 68, 68, 0.12)`
- **Information / Primary Keys**: `--cs-info: #06B6D4` (Cyan), `--cs-info-light: rgba(6, 182, 212, 0.12)`
- **Terminal Console**:
  - Background: `--cs-terminal-bg: #0D0F14`
  - Border: `--cs-terminal-border: rgba(255, 255, 255, 0.08)`
  - SQL Syntax Highlight: `#34D399` (Emerald SQL output), `#FBBF24` (Keywords)

---

## 3. Typography System

### 3.1 Font Families
- **Primary Body & Display**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  - Feature settings: `'cv02', 'cv03', 'cv04', 'cv11'` enabled for clear letterforms.
- **Monospace Code & DBMS Streams**: `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
  - Used for SQL queries, table data, primary keys, timestamps, and row counts.

### 3.2 Scale & Hierarchy
| Level | Font Size | Line Height | Letter Spacing | Weight |
|---|---|---|---|---|
| Display Hero | `2.5rem - 3.75rem` | `1.08` | `-0.035em` | Bold (`700`) |
| Heading 1 | `1.75rem - 2.25rem` | `1.15` | `-0.025em` | Bold (`700`) |
| Heading 2 | `1.25rem - 1.5rem` | `1.25` | `-0.02em` | SemiBold (`600`) |
| Heading 3 | `1.0rem - 1.125rem` | `1.35` | `-0.015em` | SemiBold (`600`) |
| Body Regular | `0.875rem` (14px) | `1.55` | `0` | Regular (`400`) |
| Body Small | `0.75rem` (12px) | `1.5` | `0` | Regular (`400`) |
| Mono Caption | `0.6875rem` (11px) | `1.4` | `+0.02em` | Medium (`500`) |

---

## 4. Spacing Scale & Layout Grid

### 4.1 4px / 8px Modular Scale
- `--cs-space-1`: `4px`
- `--cs-space-2`: `8px`
- `--cs-space-3`: `12px`
- `--cs-space-4`: `16px`
- `--cs-space-5`: `20px`
- `--cs-space-6`: `24px`
- `--cs-space-8`: `32px`
- `--cs-space-12`: `48px`
- `--cs-space-16`: `64px`

### 4.2 Breakpoints & Column Architecture
- **Mobile (< 640px)**: Single column feed, stacked hero CTA buttons, compact icon navigation.
- **Tablet (640px - 1023px)**: Responsive container, condensed split toggle, collapsible sidebar.
- **Desktop (1024px - 1439px)**: 12-column grid (`7 cols` Social Feed, `5 cols` SQL & Table Inspector).
- **Wide Desktop (≥ 1440px)**: Max container width `1280px` (`max-w-7xl`), centered alignment with generous breathing room.

---

## 5. Component Specifications

### 5.1 Buttons (`.cs-btn`)
- **Primary (`.cs-btn-primary`)**:
  - Background: `--cs-accent`
  - Text: `#FFFFFF`
  - Shadow: `0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.1) inset`
  - Hover: `--cs-accent-hover` with `translateY(-1px)`
- **Secondary (`.cs-btn-secondary`)**:
  - Background: `--cs-surface-secondary`
  - Text: `--cs-text-primary`
  - Border: `1px solid var(--cs-border-secondary)`
- **Danger (`.cs-btn-danger`)**:
  - Background: `--cs-error-light`
  - Text: `--cs-error`
  - Border: `1px solid rgba(239, 68, 68, 0.2)`
- **Sizes**:
  - Default: `height: 38px; padding: 0 16px; font-size: 13px;`
  - Small (`.cs-btn-sm`): `height: 30px; padding: 0 10px; font-size: 11px;`
  - Icon Only (`.cs-btn-icon`): `width: 32px; height: 32px; padding: 0;`

### 5.2 Form Inputs (`.cs-input`)
- Border: `1px solid var(--cs-border-secondary)`
- Focus: `border-color: var(--cs-accent); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); outline: none;`
- Border Radius: `8px` (`--cs-radius-md`)

### 5.3 Modals (`dialog.cs-modal`)
- Centering: `position: fixed; inset: 0; margin: auto;`
- Backdrop: `background: var(--cs-bg-overlay); backdrop-filter: blur(6px);`
- Animation: `cs-modal-in 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards`
- Clean Scroll Architecture: Avatar header positioned with `relative z-10 -mt-8` outside the `overflow-y: auto` body container to prevent clipping.

### 5.4 Toast Notifications (`.cs-toast`)
- Position: Fixed bottom-right (`bottom: 24px; right: 24px;`)
- Deduplication: In-memory hash deduplication with 3,000ms threshold preventing duplicate toasts.
- Auto-Dismiss: 4,000ms with 250ms slide-fade transition.

---

## 6. Iconography & 3D Interactive Assets

- **Lucide Icons**: Replaced non-standard emojis and mixed icon sets with crisp 1.75px-stroke Lucide SVG icons.
- **Spline 3D Integration**:
  - Loaded via `@splinetool/viewer` module dynamically.
  - Sized at `100% width x 100% height` with `pointer-events: auto`.
  - Fallback: CSS animated gradient orb with graceful degradation if WebGL is unavailable.
