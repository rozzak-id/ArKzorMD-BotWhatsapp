# Anti-Slop Guidelines (XIAS Quality Gates)

Common AI design defects and how to avoid them:

1. **The Wall of Equal Cards**: Never drop four equal 1/4 cards with a number and title. Always provide hierarchy: one primary lead hero card, followed by secondary telemetry cards with sparklines or status chips.
2. **Emoji Poisoning**: Never use emoji characters (e.g. 📊, 🚀, ⚡, ⚙️, 🔑). Use inline Lucide vector SVG icons or clear text labels.
3. **Contrast Traps**: Ensure dark mode text never drops below 4.5:1 on muted elements, and 7:1 for primary copy. Keep success green badges readable with dark background tints (`#10251a`) and crisp text (`#4ade80`).
4. **Interactive Honesty**: Every button and link must have distinct `:hover`, `:active`, and `:focus-visible` states.
5. **Responsive Integrity**: Never allow horizontal scrolling or overflowing elements on viewports between 320px and 1440px. Use CSS Grid with `minmax(0, 1fr)` and flexible flexbox containers.

