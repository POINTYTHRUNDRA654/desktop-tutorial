# Pip-Boy Interface Styling Guide

## Overview

Mossy now features authentic Fallout 4 Pip-Boy CRT screen aesthetics with scanlines, phosphor glow, and retro terminal effects.

## Color Schemes

### Standard Mode (Green/Cyan)
- Primary: `#00ff00` (Pip-Boy green)
- Secondary: `#00d000` (dim green)
- Tertiary: `#008000` (dark green)
- Background: `#0a0e0a` to `#1a1f1a` (dark gradient)

### Pip-Boy Mode (Amber) - Toggle in sidebar
- Primary: `#ffb84d` (amber)
- Secondary: `#e6b04a` (golden)
- Tertiary: `#b8860b` (dark amber)
- Background: `#1a1410` to `#2a2418` (warm dark)

## Visual Effects

### 1. CRT Screen Effect
Automatically applied to all screens with:
- Horizontal scanlines (animated drift)
- Vertical phosphor grid
- Vignette darkening at edges
- Subtle screen flicker
- Radial glow from center

### 2. Text Effects
- **Phosphor glow** - All text has subtle green/amber glow
- **Letter spacing** - Slightly wider for CRT feel
- **Text shadow** - Simulates phosphor burn-in
- **Monospace font** - Share Tech Mono for authentic terminal look

### 3. Animations
- **Scanline drift** - Slow vertical movement (10s loop)
- **Screen flicker** - Subtle CRT instability
- **Cursor blink** - Terminal-style cursor
- **Pulse glow** - Status indicators
- **Boot animation** - CRT power-on effect

## CSS Classes

### Frames & Containers

```css
.pipboy-frame
```
Rounded Pip-Boy style frame with:
- 16px border radius
- Green border with glow
- Inner shadow
- Dark gradient background

```css
.crt-screen
```
Full CRT effects including:
- Scanlines overlay
- Vignette effect
- Outer glow
- Inner shadow

```css
.holotape-card
```
Pip-Boy data card style:
- Gradient background
- Top/bottom glowing lines
- Border with shadow
- Rounded corners

### Navigation

```css
.pipboy-tabs
```
Pip-Boy style tab navigation:
- Uppercase text
- Letter-spaced
- Glow on active state
- Bottom border indicator

```css
.pipboy-tab
```
Individual tab button:
- Transparent background
- Green on hover
- Active state with glow

### Buttons

```css
.pipboy-button
```
Authentic Pip-Boy action button:
- Green gradient background
- Glow border
- Uppercase text
- Hover lift effect
- Active pressed state

### Text Effects

```css
.phosphor-text
```
Authentic CRT phosphor glow:
- Multiple text-shadow layers
- Letter spacing
- Monospace font
- Color glow

```css
.terminal-cursor
```
Blinking terminal cursor:
- Animated blink
- Glowing background
- Inline display

### Status Indicators

```css
.status-indicator
```
Glowing status dot:
- Pulsing animation
- Glow effect
- Active/inactive states

```css
.status-indicator.inactive
```
Dimmed state for inactive

## Toggle Pip-Boy Mode

Users can toggle between green (cyan) and amber color schemes using the Pip-Boy icon button in the sidebar.

**What happens:**
- Adds `pip-boy-mode` class to `<body>`
- Switches all colors to amber
- Changes font to Share Tech Mono
- Applies amber-specific glow effects
- Persists in localStorage

## Usage Examples

### Basic Pip-Boy Container
```tsx
<div className="pipboy-frame crt-screen">
  <div className="pipboy-tabs">
    <button className="pipboy-tab active">STAT</button>
    <button className="pipboy-tab">INV</button>
    <button className="pipboy-tab">DATA</button>
    <button className="pipboy-tab">MAP</button>
  </div>
  <div className="p-6">
    <h2 className="phosphor-text">Terminal Ready</h2>
    <span className="terminal-cursor"></span>
  </div>
</div>
```

### Status Display
```tsx
<div className="holotape-card">
  <div className="flex items-center gap-2">
    <span className="status-indicator"></span>
    <span className="phosphor-text">System Online</span>
  </div>
</div>
```

### Action Button
```tsx
<button className="pipboy-button">
  Initialize Protocol
</button>
```

## Effects Reference

### Screen Effects
- **Scanlines:** Always visible, slow drift animation
- **Phosphor grid:** Vertical lines simulating CRT pixels
- **Vignette:** Dark edges, lighter center
- **Flicker:** Subtle brightness variation
- **Static:** Very subtle noise overlay

### Color Glows
- **Green mode:** Cyan-green (#00ff00) glow
- **Amber mode:** Golden-amber (#ffb84d) glow
- **Intensity:** Multiple shadow layers for depth

### Typography
- **Primary font:** Orbitron (headings, UI)
- **Monospace:** Share Tech Mono (code, terminal)
- **Letter spacing:** 0.05em for CRT feel
- **Text shadow:** Phosphor glow effect

## Performance Notes

All effects are optimized:
- CSS animations (GPU accelerated)
- Minimal JavaScript
- ::before and ::after pseudo-elements
- No heavy filters or backdrops

## Accessibility

- Effects can be reduced via system preferences
- Color contrast meets WCAG AA standards
- Text remains readable through effects
- Animations respect prefers-reduced-motion

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (may have slight animation differences)
- Electron: Perfect support (built-in Chromium)

---

## Visual Hierarchy

**Brightest (Most Attention):**
1. Active tab glow
2. Primary action buttons
3. Status indicators (active)
4. Hover states

**Medium Brightness:**
1. Body text
2. Inactive tabs
3. Borders
4. Card backgrounds

**Darkest:**
1. Main background
2. Shadows
3. Vignette edges
4. Inactive indicators

## Color Harmony

The interface uses a **monochromatic** color scheme:
- Single hue (green or amber)
- Varying brightness levels
- Consistent glow effects
- High contrast for readability

This matches the original Pip-Boy design philosophy: limited color palette due to CRT technology constraints.

---

**TIP:** For best Pip-Boy immersion, enable full-screen mode and toggle Pip-Boy mode (amber) for the authentic Fallout 4 experience!
