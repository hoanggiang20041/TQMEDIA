---
name: TQMEDIA Core
colors:
  surface: '#15121b'
  surface-dim: '#15121b'
  surface-bright: '#3c3742'
  surface-container-lowest: '#100d16'
  surface-container-low: '#1d1a24'
  surface-container: '#221e28'
  surface-container-high: '#2c2833'
  surface-container-highest: '#37333e'
  on-surface: '#e8dfee'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#e8dfee'
  inverse-on-surface: '#332f39'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffb784'
  on-tertiary: '#4f2500'
  tertiary-container: '#a15100'
  on-tertiary-container: '#ffe0cd'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb784'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#15121b'
  on-background: '#e8dfee'
  surface-variant: '#37333e'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  code-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  max-width: 1440px
---

## Brand & Style
The design system focuses on a high-end, developer-centric aesthetic tailored for social marketing automation. It targets tech-savvy marketers and agencies who value speed, precision, and visual sophistication.

The style is a synthesis of **Glassmorphism** and **Modern SaaS** aesthetics (inspired by Linear and Vercel). The UI evokes a sense of "digital craftsmanship" through deep layering, subtle translucency, and precise illumination. The interface feels like a high-performance command center—dark, immersive, and focused, with neon accents providing a sense of energy and activity.

## Colors
The palette is rooted in a deep navy foundation to maximize contrast for the neon accents.

- **Primary Purple (#7c3aed):** Used for core actions, active states, and primary brand moments.
- **Secondary Cyan (#06b6d4):** Used for data visualization, secondary highlights, and success indicators.
- **Background & Surfaces:** The base background is a solid Dark Navy. Surfaces and containers use a Deep Navy with varying levels of transparency to create the glass effect.
- **Accents:** Neon glows are achieved through low-opacity versions of the primary and secondary colors, typically used in backdrop blurs and subtle border gradients.

## Typography
The system utilizes a dual-font approach to balance technical precision with readability.

- **Geist** is the primary choice for headings, labels, and UI controls. Its monospaced-inspired metrics provide a clean, "pro-tool" feel.
- **Inter** is utilized for body copy and long-form text to ensure maximum legibility and support for Vietnamese diacritics.
- **Visual Treatment:** Display headings should use tight letter-spacing. Labels and metadata should be uppercase with slight tracking to enhance the systematic look.

## Layout & Spacing
This design system employs a **fluid grid** with strict adherence to a 4px baseline.

- **Desktop:** 12-column grid with a 24px gutter. Content is centered with a max-width of 1440px.
- **Mobile:** Single column layout with 16px side margins.
- **Philosophy:** Use generous padding within cards (24px - 32px) to allow the glassmorphism effects to "breathe." Layouts should prioritize vertical scanning and clear grouping of data clusters.

## Elevation & Depth
Depth is created through light and transparency rather than traditional heavy shadows.

- **Tiers of Glass:** The background is the lowest level. Primary cards use a background of `#111827` at 80% opacity with a `backdrop-filter: blur(12px)`.
- **Luminescent Borders:** Instead of shadows, use 1px solid borders with a linear gradient (top-left to bottom-right). The gradient should move from a low-opacity white/cyan to transparent.
- **Glows:** Active elements (like the current campaign card) feature a "neon underglow"—a soft, diffused shadow using the primary purple color with 20% opacity and a 20px blur.

## Shapes
Shapes are modern and refined.

- **Standard Radius:** 8px (0.5rem) for most buttons, inputs, and small components.
- **Container Radius:** 16px (1rem) for main dashboard cards and modals.
- **Interactive Elements:** Buttons maintain a distinct rounded corner to feel accessible yet professional. Avoid sharp 0px corners to maintain the premium SaaS feel.

## Components
Consistent component styling ensures the platform feels like a unified tool.

- **Glass Cards:** Always include a `1px` border (Stroke: `#ffffff10`) and a subtle inner glow.
- **Buttons:** 
  - *Primary:* Solid Purple (#7c3aed) with a faint outer glow on hover.
  - *Secondary:* Ghost style with a Cyan border and glass background.
- **Input Fields:** Darker than the card background, using a `1px` border that turns Cyan on focus. Include "Micro-glow" typography for errors.
- **Chips/Badges:** Small, high-contrast pills with low-opacity background fills (e.g., Cyan background at 10% with solid Cyan text).
- **Navigation:** Vertical sidebar using "Active State Indicator"—a vertical purple line on the left of the active menu item with a subtle gradient background.
- **Transitions:** All hover states must use a `200ms ease-out` transition for opacity and transform (slight Y-axis lift for cards).