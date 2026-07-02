# CLAUDE.md — WealthWise UI Revamp

## Mission

Visual overhaul of the WealthWise frontend. The goal is to take the current default-Tailwind aesthetic and replace it with a distinctive, high-end fintech look that feels like a private wealth management dashboard — not a generic SaaS template. **Backend is frozen. Do not touch `apps/api/`, Supabase config, or CI/CD pipelines.**

## Scope

**In scope:** Everything under `apps/web/` — components, pages, styles, Tailwind config, layout structure, typography, color system, animations, dark/light mode theming, and responsive behavior.

**Out of scope:** API endpoints, database schema, authentication flow logic, deployment config, test files under `apps/api/`. If a change requires backend modification, flag it and move on.

## Tech Stack (do not change)

- React 18 + TypeScript (strict)
- Vite (bundler + dev server)
- TailwindCSS (utility-first styling)
- Supabase Auth (JWT, handled in frontend auth layer)
- Deployed on Vercel

## Design Direction

### Aesthetic: "Private Banking Terminal"

Think Bloomberg Terminal meets Bottega Veneta — data-dense but calm, luxurious but functional. This is not a consumer budgeting app. It's a personal wealth command center.

### Color System

Build a semantic token system in `tailwind.config.ts` using CSS custom properties so dark/light mode switching is a single class toggle on `<html>`.

**Dark mode (primary):**
- Background: deep charcoal/near-black (`#0F1117` base, `#161820` surface, `#1E2028` elevated)
- Text: off-white (`#E8E6E1`) with muted secondary (`#8A8B8E`)
- Accent: muted gold/champagne (`#C9A96E`) — used sparingly for active states, key metrics, selected nav items
- Success: `#4CAF82`, Danger: `#CF6679`, Warning: `#E8B86D`
- Borders: subtle (`rgba(255,255,255,0.06)`)

**Light mode:**
- Background: warm off-white (`#FAFAF7` base, `#FFFFFF` surface, `#F2F1EE` elevated)
- Text: deep charcoal (`#1A1A1A`) with muted secondary (`#6B6B6B`)
- Accent: same gold but darker variant (`#A8853A`)
- Borders: subtle (`rgba(0,0,0,0.08)`)

### Typography

Use a deliberate type pairing loaded via Google Fonts or self-hosted:

- **Display / Headings:** A refined serif — `DM Serif Display`, `Playfair Display`, or `Cormorant Garamond`. Used for page titles, net worth figure, key monetary values. Not overused — this is the signature element.
- **Body / UI:** A clean geometric sans — `Inter`, `DM Sans`, or `Outfit`. Used for tables, labels, nav, buttons, form inputs.
- **Monospace (numbers/data):** `JetBrains Mono` or `IBM Plex Mono` — for transaction amounts, account balances, percentage changes. Tabular figures enabled.

Set a type scale with clear hierarchy:
- Hero metric (net worth): 3rem+ serif, letter-spacing -0.02em
- Page title: 1.5rem serif
- Section headers: 0.875rem uppercase sans, wide letter-spacing, muted color
- Body: 0.9375rem sans
- Caption/meta: 0.8125rem sans, muted

### Layout Principles

- **Sidebar navigation** (collapsible on mobile): vertical nav with icon + label, active item indicated by accent color left border or subtle background shift — not a loud highlight.
- **Content area:** generous whitespace. Cards with subtle borders (no heavy shadows). Data tables should breathe — adequate row height, no zebra striping, hover highlight only.
- **Dashboard:** Net worth as the hero element in serif at the top. Below: 2-3 column grid of summary cards (income vs expenses, top categories, account balances). Charts below the fold.
- **Mobile:** Single-column stack. Bottom tab nav replaces sidebar. Touch-friendly tap targets (min 44px).

### Component Style Guide

**Cards:** Low border-radius (6-8px). 1px border in theme border color. No drop shadows in dark mode; very subtle shadow in light mode. Slight background elevation from base.

**Buttons:**
- Primary: Gold accent bg, dark text. Subtle hover darken. No rounded-full — use rounded-md.
- Secondary: Transparent with border. Hover fills with subtle bg.
- Destructive: Muted red, not screaming.

**Tables:** Clean horizontal rules only (no vertical grid lines). Header row in uppercase small caps, muted. Row hover with very subtle bg shift. Amount columns right-aligned in monospace.

**Charts:** Use muted, desaturated palette that complements the gold accent. Avoid loud primary colors. Prefer area charts with gradient fills, thin line charts. Minimal gridlines, no chart borders.

**Forms/Inputs:** Minimal. Bottom-border or low-contrast outline style. Focus state uses accent color. Labels above inputs, small and muted.

**Modals/Drawers:** Backdrop blur. Slide-in from right for creation flows. Centered modal for confirmations. Same card styling.

**Toasts/Notifications:** Top-right, minimal, auto-dismiss. Icon + message, no title bloat.

### Animations & Transitions

- Page transitions: subtle fade (150ms)
- Card hover: slight translateY (-2px) with ease-out
- Number changes (net worth, balances): count-up animation on load
- Skeleton loaders for async data (not spinners)
- `prefers-reduced-motion`: respect it, disable all non-essential animation

### Charts & Data Visualization

This is where most finance apps fall apart — they drop in Recharts/Chart.js defaults and call it done. Every chart in WealthWise should look like it belongs on a Bloomberg terminal or a Wealthfront annual report. The chart styling is a signature differentiator, not an afterthought.

**Before touching any chart component**, audit the codebase for the current charting library. If it's Recharts, keep it — it's React-native and composable enough for this restyle. If it's Chart.js via react-chartjs-2, evaluate whether migrating to Recharts is worth it for better React integration. If migrating, do it as a dedicated step before restyling. Document the decision.

#### Chart Palette

Do not use Recharts/Chart.js default colors. Define a custom chart palette derived from the design tokens:

```
Dark mode chart fills:
  primary:    #C9A96E (gold accent — use for the single most important series)
  secondary:  #5B8A72 (muted sage)
  tertiary:   #6B7FA3 (slate blue)
  quaternary: #A67C8A (dusty rose)
  quinary:    #8B8569 (warm stone)
  
  Grid lines:     rgba(255, 255, 255, 0.04)
  Axis labels:    #5A5B5E (muted, small, mono font)
  Tooltip bg:     #1E2028 with 1px border rgba(255,255,255,0.08)
  Tooltip text:   #E8E6E1

Light mode chart fills:
  primary:    #A8853A (darker gold)
  secondary:  #3D7A5A (deeper sage)
  tertiary:   #4A6380 (deeper blue)
  quaternary: #8A5A6A (deeper rose)
  quinary:    #6B6550 (deeper stone)

  Grid lines:     rgba(0, 0, 0, 0.05)
  Axis labels:    #8A8A8A
  Tooltip bg:     #FFFFFF with subtle shadow
  Tooltip text:   #1A1A1A
```

#### Chart Types by Use Case

**Net Worth Over Time (Dashboard hero chart):**
- Area chart with a single gold gradient fill (top: accent at 20% opacity → bottom: transparent)
- Thin 1.5px solid line on top of the area fill
- No dots on data points by default; show dot only on hover/active
- X-axis: abbreviated months (`Jan`, `Feb`), no tick marks, labels in monospace
- Y-axis: abbreviated currency (`$12.4K`, `$250K`), right-aligned, no axis line
- Minimal horizontal grid lines only (3-4 max), no vertical grid
- Crosshair on hover: vertical dashed line + floating tooltip

**Income vs Expenses (Monthly comparison):**
- Grouped bar chart, NOT stacked
- Income bars: gold accent. Expense bars: muted slate (`#5A5B5E` dark / `#B0B0B0` light)
- Rounded top corners only (border-radius 3px top)
- Bar width: 60% of available space (generous gap between groups)
- Hover: single bar highlights, others dim to 40% opacity
- Value label appears above bar on hover, not permanently visible

**Category Breakdown (Spending distribution):**
- Donut chart, NOT pie chart
- Inner radius ~60% of outer radius (thick ring, not a thin arc)
- Use the full chart palette, but limit to top 5-6 categories; group the rest as "Other" in the muted stone color
- No labels on the chart itself — use a legend below or beside the donut
- Legend: horizontal on desktop, vertical on mobile. Small color dots, not squares
- Center of donut: total amount in serif display font, category name below in small sans
- Hover: segment expands outward 4px, center text updates to hovered category

**Account Balance History:**
- Multi-line chart, one line per account
- Thin lines (1.5px), distinguished by palette colors
- No fill/area — lines only for multi-series
- Interactive legend: click to toggle series visibility
- Y-axis shared, formatted in abbreviated currency

**Portfolio Allocation:**
- Donut chart (same style as category breakdown)
- Center: total portfolio value in serif
- Segment hover shows asset name, value, percentage, and gain/loss

**ROI / Gain-Loss Indicators:**
- Inline sparklines for small trend indicators on cards (tiny area or line, no axes, ~60x20px)
- Green fill for positive trend, red for negative (use the success/danger tokens, not raw hex)
- Percentage badge beside the sparkline: green bg with white text (positive), red bg (negative), subtle rounded pill shape

#### Chart Component Architecture

Create a shared chart theme config that all chart components consume:

```
apps/web/src/lib/chartTheme.ts
```

This file exports:
- `CHART_COLORS` — the palette arrays for dark/light
- `CHART_DEFAULTS` — shared axis styling, grid config, tooltip config, animation settings
- `formatCurrency(value)` — abbreviated currency formatter for axes (`$1.2K`, `$45.3K`, `$1.2M`)
- `formatDate(date, granularity)` — consistent date formatting for x-axes

Every chart component imports from this file. No chart should define its own colors or axis styles inline.

#### Chart Animations

- Initial render: draw-in animation (line traces left to right, bars grow upward) — 600ms ease-out
- Data update: smooth morph transition (300ms)
- Tooltip: fade in (100ms), no slide
- `prefers-reduced-motion`: instant render, no draw-in, tooltips still appear but without fade

#### Chart Responsive Behavior

- Desktop: charts at full width within their card container, generous padding
- Tablet: same layout, reduce axis label count to prevent overlap
- Mobile (<640px): charts full-bleed within card, hide y-axis labels (show only on tooltip), reduce data point density if needed, legend stacks vertically below chart
- Touch: tooltip triggers on tap, not hover. Tap away to dismiss.

#### What "Done" Looks Like for Charts

Pull up the Wealthfront or Mercury Bank dashboards. Your charts should feel that composed — muted palette, clean axes, no chartjunk, tooltips that show exactly what's needed. If any chart still has default blue/red/green fills, visible grid boxes, thick axis lines, or Comic Sans energy in its labels — it's not done.

### Existing Features to Preserve (visual only, logic untouched)

- Dark mode / light mode toggle (retheme, don't remove)
- Accent color customization (remap to work with new token system)
- Multi-language support (EN, FR-CA) — don't break i18n keys
- Demo mode entry point on sign-in page
- CSV / OFX import flow UI
- Mobile responsiveness (improve, don't regress)

## Working Process

1. **Start with the design tokens:** Update `tailwind.config.ts` with the full color/typography/spacing system. This is the foundation everything else builds on.
2. **Layout shell next:** Sidebar nav + content area + mobile bottom nav. Get the bones right.
3. **Chart theme system:** Create `src/lib/chartTheme.ts` with palette, defaults, formatters. Audit current charting library and decide keep-or-migrate.
4. **Dashboard page:** This is the showcase. Net worth hero (serif + count-up), summary cards, restyled charts.
5. **Transaction list:** The most-used page. Table, filters, bulk actions. Must be fast and clean.
6. **Remaining pages:** Accounts (balance history charts), Assets/Portfolio (allocation donut, ROI sparklines), Categories, Settings — apply the system consistently.
7. **Sign-in page:** The first impression. Clean, minimal, premium feel. Logo + form + demo button.
8. **Polish pass:** Chart animations, skeleton states, empty states, error states, responsive edge cases, touch behavior on chart tooltips.

## Constraints

- No new npm dependencies without justification. Prefer Tailwind utilities over component libraries.
- Charting library: keep what's there unless migration to Recharts is clearly justified. If migrating, do it as a separate commit before restyling. All chart colors must come from `chartTheme.ts`, never inline hex values.
- All changes must pass `npm run build` with zero TypeScript errors.
- Test on Chrome, Safari, Firefox. Test mobile at 375px and 390px widths.
- Preserve all existing functionality. This is a visual layer change, not a feature rewrite.
- Do not modify any API call signatures, request/response types, or auth flow logic.
- Commit atomic changes: tokens → layout → page-by-page. Not one massive commit.

## Quality Bar

When you're done, the app should feel like it belongs on a portfolio alongside Bloomberg Terminal, Wealthfront, or Mercury Bank — not alongside a Tailwind UI template. Every pixel should look intentional. If something looks like a default, it's not done yet. Charts specifically: if you can tell what library rendered it from the default styling alone, it needs more work.
