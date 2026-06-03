---
name: Retail Nexus Design System
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#3f484b'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#6f797c'
  outline-variant: '#bec8cc'
  surface-tint: '#00687a'
  primary: '#005c6c'
  on-primary: '#ffffff'
  primary-container: '#0e768a'
  on-primary-container: '#d1f4ff'
  inverse-primary: '#80d2e8'
  secondary: '#5a5f62'
  on-secondary: '#ffffff'
  secondary-container: '#dce0e4'
  on-secondary-container: '#5e6367'
  tertiary: '#903719'
  on-tertiary: '#ffffff'
  tertiary-container: '#b04e2e'
  on-tertiary-container: '#ffe9e4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#80d2e8'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#dfe3e7'
  secondary-fixed-dim: '#c3c7cb'
  on-secondary-fixed: '#171c1f'
  on-secondary-fixed-variant: '#43474b'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#7f2a0d'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for a dual-purpose environment: operational efficiency for retail staff and seamless engagement for the community. The visual language balances **Corporate Modernism** with a soft, **Human-Centric** touch.

- **Personality:** Reliable, systematic, and approachable. It feels like a high-end concierge service—expert and efficient, yet warm.
- **Visual Style:** Clean card-based layouts with generous whitespace. We utilize a "Soft-Professional" aesthetic, moving away from harsh edges toward refined, rounded geometry.
- **Emotional Response:** Users should feel a sense of clarity and trust. The UI recedes to let tasks and community content take center stage.

## Colors
The palette is rooted in a professional Deep Teal that signals competence and stability.

- **Primary (Deep Teal):** Used for critical actions, navigation states, and branding. It provides high contrast against light backgrounds.
- **Secondary (Ice Blue/Gray):** A range of cool-toned neutrals used for card backgrounds and page-level grounding.
- **Tertiary (Coral):** An accent color used sparingly for notifications or "Live" community tags to provide warmth and visual interest.
- **Functional Grays:** A spectrum of grays from `#1A1C1E` (Text) to `#F8FAFC` (Backgrounds) ensures a clear information hierarchy.

## Typography
We use **Inter** for its exceptional legibility and neutral, modern character. The scale is designed to prioritize scanning—crucial for retail managers on the move.

- **Headlines:** Use Bold and Semi-Bold weights with slight negative letter-spacing to create a "compact" and authoritative feel.
- **Body:** Standardized at 16px for optimal readability. 14px is reserved for secondary metadata and list descriptions.
- **Labels:** Small caps or bolded 12px font are used for categorizing content (e.g., store categories or status indicators).

## Layout & Spacing
The design system utilizes a **8px linear scale** for consistent rhythm across all components.

- **Grid:** A fluid 12-column grid for desktop and a 4-column grid for mobile.
- **Margins:** 16px on mobile devices to maximize screen real estate, increasing to 40px on desktop for a premium, spacious feel.
- **Gaps:** Standardize on 16px (md) for spacing between cards and 24px (lg) for major section breaks.

## Elevation & Depth
Depth is created through **Tonal Layering** and soft, ambient shadows rather than heavy lines.

- **Surface Levels:** 
    - **L0 (Background):** `#F8FAFC` (Cool white)
    - **L1 (Cards):** `#FFFFFF` (Pure white) with a very soft shadow (0px 4px 12px rgba(0,0,0,0.05)).
    - **L2 (Popovers/Modals):** Pure white with a more defined shadow (0px 12px 24px rgba(0,0,0,0.1)).
- **Outlines:** Use a 1px border of `#E2E8F0` for form inputs and low-emphasis buttons instead of shadows.

## Shapes
A **Rounded** language is applied to reinforce the community-focused, approachable aspect of the brand.

- **Standard Elements:** Buttons and small cards use a `0.5rem` (8px) radius.
- **Large Container:** Content blocks and featured banners use a `1rem` (16px) radius to create a distinct visual "nesting" effect.
- **Interactive Elements:** Search bars and tag chips use a "Pill" style (full rounding) to differentiate them from structural content containers.

## Components

### Buttons
- **Primary:** Filled Primary Teal with white text. High-contrast, 0.5rem roundedness.
- **Secondary:** Ghost style with Teal border and text. 
- **Icon Buttons:** Use a light teal or gray background circle (`#F0F7F9`) to frame the icon.

### Cards
- Cards are the core organizational unit. They feature 16px padding, a white background, and a soft L1 shadow.
- **Action Cards:** (e.g., Shop Inquiry, Parking) feature a centered thin-stroke icon (1.5pt weight) above a Medium weight label.

### Input Fields
- Inputs use a `1px` border in Light Gray (`#CBD5E1`). On focus, the border transitions to Primary Teal with a subtle 2px glow.
- Labels are always positioned above the field in `label-md` typography.

### Chips & Tags
- **Status Tags:** Soft background tints with dark text (e.g., Light Green background with Dark Green text for "Open").
- **Community Chips:** Pill-shaped, used for filtering categories (e.g., "Promotion", "Events").

### Navigation
- **Bottom Bar (Mobile):** High-blur backdrop (Glassmorphism) with 70% opacity. Icons use the Primary color only when active, otherwise a medium-gray.
- **Top Bar:** Minimalist, using `headline-sm` for titles and a simple back arrow or location pin icon.