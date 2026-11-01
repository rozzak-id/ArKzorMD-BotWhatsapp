---
name: ux-ui-agent-skills
description: Senior UX/UI Design Architect skill based on plugin87/ux-ui-agent-skills (XIAS). Enforces 3-tier DTCG design tokens, WCAG 2.2 AA-AAA accessibility standards, Linear/Vercel-grade dark-tech and modern SaaS aesthetics, zero-emoji policy (vector SVG only), and anti-slop verification gates. Use whenever designing, reviewing, or styling Web UI, components, dashboards, and design systems.
---

# Skill: UX/UI Design Architect (XIAS Doctrine)

Grounded in the design system doctrine of `plugin87/ux-ui-agent-skills`. Transforms coding agents into Senior Design Architects who think in systems, tokens, and accessible, production-ready interfaces.

---

## 1. The Decision Framework

Prioritize decisions strictly in this order:
1. **User Needs**: Does this serve the primary user workflow? Is the task clearly completable?
2. **Accessibility (WCAG 2.2)**: Is it perceivable, operable, understandable, and robust (POUR)? Minimum 4.5:1 text contrast, double-ring focus indicators, 44x44px touch targets.
3. **Consistency**: Does it strictly map to the token architecture (colors, spacing, typography, radii, elevation)?
4. **Aesthetics & Taste**: Is the hierarchy intentional, balanced, and visually refined?
5. **Developer Experience**: Is it modular, maintainable, and free of extraneous runtime dependencies?

> **Aesthetic rule**: Taste never overrides User Needs, Accessibility, or Consistency. A brand color that fails contrast gets tuned.

---

## 2. Absolute Anti-Slop Non-Negotiables

1. **Zero Emojis**: Never use emojis as icons, status bullets, or decorative accents in UI, code, or documentation. Use clean, monoline vector SVG icons (Lucide style) or plain descriptive text.
2. **No Single-Radius Laziness**: Avoid applying the same `border-radius: 6px` to everything. Use a purposeful radius scale:
   - `xs (4px)`: tags, inner badges, checkboxes
   - `sm (6px)`: inputs, tooltips, inline buttons
   - `md (10px)`: cards, modal dialogs, menus
   - `lg (16px)`: hero panels, feature containers
   - `pill (9999px)`: status chips, avatars, toggle pills
3. **Multi-Layered Elevation Shadows**: Avoid flat, muddy single-value shadows (e.g., `0 2px 4px #000`). Use multi-stop ambient light shadows with subtle hairline translucent borders (`box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05); border: 1px solid var(--border)`).
4. **No Wall of Equal Cards**: Avoid `grid-template-columns: repeat(4, 1fr)` with four identical cards. Compose in intentional bands:
   - Band 1: Hero context & primary lead metric
   - Band 2: Asymmetric secondary telemetry with sparklines/charts
   - Band 3: Actionable split console (queues + activity feeds)
   - Band 4: Detailed searchable/filterable tables
5. **Double-Ring Focus Visible**: Focus rings must remain distinct on both light and dark backgrounds (`outline: 2px solid var(--accent); outline-offset: 2px`).

---

## 3. 3-Tier DTCG Token Architecture

1. **Primitives**: Pure values (`palette.slate.900`, `space.4`, `radius.md`, `shadow.elevation-2`).
2. **Semantics**: Intent and contextual role:
   - `--canvas-bg`: Main app backdrop
   - `--surface-card`: Resting card elevation
   - `--surface-raised`: Hover/floating popover elevation
   - `--surface-sunken`: Form input/table header background
   - `--border-subtle`: Default card & divider border
   - `--border-strong`: Active/focused container border
   - `--accent-primary`: Brand action color (emerald/cyan)
   - `--accent-glow`: Translucent brand glow for primary elements
   - `--status-ok`, `--status-warn`, `--status-danger`, `--status-info`
3. **Components**: Element-scoped tokens (`--card-padding`, `--btn-height`, `--nav-width`).

---

## 4. Visual Direction: Modern Dark-Tech / Refined SaaS

- **Color Mood**: Deep obsidian/slate canvas (`#090d12`, `#0f141c`) paired with emerald/cyan cyber accents (`#10b981`, `#06b6d4`).
- **Surface Depth**: Subtle glassmorphism (`backdrop-filter: blur(12px)`), hairline borders (`rgba(255,255,255,0.08)` in dark mode), radial background ambient glow.
- **Typography**: Monospace tabular numbers (`font-variant-numeric: tabular-nums`) for telemetry and metrics; tight tracking (`letter-spacing: -0.02em`) on headings.
- **Micro-Interactions**: Smooth 150ms transitions (`cubic-bezier(0.16, 1, 0.3, 1)`), tactile button active presses (`transform: translateY(1px)`).

