# 🎨 WeddingFlow Pro - Theme System Documentation

## Overview

WeddingFlow Pro features a sophisticated, fully-customizable theme system that allows complete white-labeling. The theme system supports:

- ✅ **Dynamic Color Palettes** - Full 50-950 shade generation from any hex color
- ✅ **Custom Fonts** - Google Fonts loaded dynamically
- ✅ **Real-time Updates** - Changes apply instantly across entire app
- ✅ **Multi-tenant Support** - Each company has unique branding
- ✅ **Semantic Colors** - Theme-aware utility classes

---

## 🏗️ Architecture

### 1. BrandingProvider (`src/app/providers/branding-provider.tsx`)

The heart of the theme system. Responsibilities:

- **Fetches** company branding from Convex
- **Converts** hex colors → HSL format
- **Generates** complete color palettes (50-950 shades)
- **Sets** CSS variables on `:root`
- **Loads** Google Fonts dynamically
- **Applies** font-family to body

### 2. CSS Variables (`src/app/globals.css`)

Default theme defined in `:root`:

```css
:root {
  /* Base colors */
  --primary: 262.1 83.3% 57.8%;
  --secondary: 327 73% 57%;
  --accent: 47 92% 53%;

  /* Full primary palette */
  --primary-50: 262 87% 97%;
  --primary-100: 262 82% 94%;
  ... (up to 950)

  /* Font family */
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

### 3. Tailwind Config (`tailwind.config.ts`)

Maps CSS variables to Tailwind classes:

```typescript
colors: {
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    50: 'hsl(var(--primary-50))',
    ...
  }
}
```

### 4. Branding Form (`src/components/settings/branding-form.tsx`)

User interface for:
- Uploading logos
- Selecting colors (with color picker)
- Choosing fonts from dropdown
- Adding custom CSS

---

## 🎨 Using Theme Colors

### Tailwind Classes (Recommended)

Always use theme-aware Tailwind classes:

```tsx
// ✅ CORRECT - Uses theme
<Button className="bg-primary text-primary-foreground">Save</Button>
<div className="bg-primary-100 text-primary-900">Info</div>

// ❌ WRONG - Hardcoded color
<Button className="bg-blue-600 text-white">Save</Button>
<div className="bg-blue-100 text-blue-900">Info</div>
```

### Available Theme Colors

| Class Pattern | Description | Shades |
|--------------|-------------|---------|
| `bg-primary-*` | Primary brand color | 50-950 |
| `text-primary-*` | Primary text color | 50-950 |
| `border-primary-*` | Primary border | 50-950 |
| `bg-secondary-*` | Secondary brand color | 50-950 |
| `bg-accent-*` | Accent color | 50-950 |

### Semantic Utility Classes

For common use cases:

```tsx
// Theme-aware backgrounds
<div className="bg-theme-light">      // primary-50
<div className="bg-theme-lighter">    // primary-100
<div className="bg-theme-base">       // primary
<div className="bg-theme-dark">       // primary-600

// Theme-aware text
<h1 className="text-heading">         // Auto-themed heading
<p className="text-body">             // Auto-themed body text
<span className="text-theme-base">    // Primary color text

// Status colors (don't change with theme)
<div className="status-info">         // Blue (informational)
<div className="status-success">      // Green (success)
<div className="status-warning">      // Amber (warning)
<div className="status-error">        // Red (error)
```

---

## 🔤 Using Theme Fonts

### Body Element

Font automatically applied via CSS:

```css
body {
  font-family: var(--font-sans);
}
```

### Custom Components

All components inherit from body:

```tsx
// No special font classes needed - inherits automatically
<div>This text uses the theme font</div>
```

### Override Font (if needed)

```tsx
<div style={{ fontFamily: 'monospace' }}>Code snippet</div>
```

---

## 🎛️ How Theme Changes Work

### Step-by-Step Flow

1. **User** changes color in Settings → Branding
2. **BrandingForm** calls `updateBranding` mutation
3. **Convex** saves new branding to database
4. **BrandingProvider** receives update via reactive query
5. **useEffect** triggers, detecting branding change
6. **Hex → HSL** conversion happens
7. **Palette generation** creates 50-950 shades
8. **CSS variables** updated on `:root`
9. **All components** re-render with new colors automatically
10. **Font** loaded dynamically if Google Font

### Example: Changing Primary Color

```javascript
// User selects #FF6B9D (pink)
hexToHSL('#FF6B9D') // → { h: 340, s: 100, l: 70 }

// Palette generated:
--primary-50: 340 100% 97%    // Very light pink
--primary-100: 340 95% 94%
--primary-500: 340 100% 70%   // Base color
--primary-900: 340 100% 18%   // Very dark pink
--primary-950: 340 100% 9%    // Almost black pink

// All components using bg-primary, text-primary etc. update instantly!
```

---

## 🚀 Best Practices

### 1. Always Use Theme Colors

```tsx
// ✅ Theme-aware
<Card className="bg-card border-border">
<Button className="bg-primary hover:bg-primary/90">

// ❌ Hardcoded
<Card className="bg-white border-gray-200">
<Button className="bg-purple-600 hover:bg-purple-700">
```

### 2. Use Semantic Classes for Context

```tsx
// ✅ Clear intent
<Alert className="status-warning">Budget alert</Alert>
<div className="status-success">Task completed</div>

// ❌ Unclear
<Alert className="bg-yellow-100 text-yellow-900">Budget alert</Alert>
```

### 3. Use Full Palette for Hierarchy

```tsx
// ✅ Visual hierarchy
<Card className="bg-primary-50 border-primary-200">
  <h3 className="text-primary-900">Title</h3>
  <p className="text-primary-700">Content</p>
  <span className="text-primary-500">Accent</span>
</Card>
```

### 4. Status Colors Don't Change

Keep status colors consistent across themes:

```tsx
// ✅ Always green for success
<Badge className="status-success">Approved</Badge>

// ❌ Would change with theme
<Badge className="bg-primary-100">Approved</Badge>
```

---

## 🧪 Testing Theme Changes

### Manual Testing Checklist

1. ✅ Go to Settings → Branding
2. ✅ Change primary color → Check buttons, links, badges
3. ✅ Change secondary color → Check secondary UI elements
4. ✅ Change accent color → Check CTAs, highlights
5. ✅ Change font → Check all text updates
6. ✅ Navigate to different pages → Check consistency
7. ✅ Check light/dark mode (if implemented)

### Component Audit

Search for hardcoded colors:

```bash
# Find hardcoded blue colors
grep -r "bg-blue-\|text-blue-" src/components --include="*.tsx"

# Find hardcoded purple colors
grep -r "bg-purple-\|text-purple-" src/components --include="*.tsx"
```

Replace with theme colors:
- `bg-blue-500` → `bg-primary`
- `bg-blue-100` → `bg-primary-100`
- `text-blue-900` → `text-primary-900`

---

## 🎯 Common Patterns

### Buttons

```tsx
// Primary button
<Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
  Save
</Button>

// Secondary button
<Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
  Cancel
</Button>

// Accent button
<Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
  Upgrade
</Button>
```

### Cards

```tsx
// Light themed card
<Card className="bg-primary-50 border-primary-200">
  <CardTitle className="text-primary-900">Title</CardTitle>
  <CardContent className="text-primary-700">Content</CardContent>
</Card>

// Default card (uses system colors)
<Card className="bg-card border-border">
  <CardTitle className="text-foreground">Title</CardTitle>
</Card>
```

### Badges

```tsx
// Theme badge
<Badge className="bg-primary text-primary-foreground">New</Badge>

// Status badge
<Badge className="status-success">Completed</Badge>
<Badge className="status-warning">Pending</Badge>
```

### Icons

```tsx
// Themed icon
<CheckCircle className="text-primary" />

// Status icon
<AlertTriangle className="text-amber-500" />  // OK for status
```

---

## 🐛 Troubleshooting

### Theme Not Updating?

1. **Check Console**: BrandingProvider logs theme application
   ```
   ✅ Primary palette generated: #FF6B9D → {...}
   ✅ Font family applied: Roboto
   🎨 Theme system initialized
   ```

2. **Verify CSS Variables**: Inspect element → Computed → Search for `--primary`
3. **Check Convex**: Ensure branding saved to database
4. **Clear Browser Cache**: Hard refresh (Cmd+Shift+R)

### Font Not Loading?

1. **Check Console**: Look for "🔤 Loading Google Font: ..."
2. **Network Tab**: Verify Google Fonts request
3. **Font Name**: Ensure exact match in font dropdown
4. **Fallback**: System fonts used if Google Fonts fail

### Colors Look Wrong?

1. **HSL Conversion**: Check console logs for palette
2. **Contrast**: Ensure sufficient contrast (WCAG AA)
3. **Hardcoded Colors**: Search for `bg-blue`, `text-purple`, etc.

---

## 📚 Reference

### Color Palette Structure

Each theme color has 11 shades:

| Shade | Lightness | Use Case |
|-------|-----------|----------|
| 50 | 97% | Backgrounds, subtle highlights |
| 100 | 94% | Light backgrounds |
| 200 | 86% | Hover states, borders |
| 300 | 77% | Disabled states |
| 400 | 66% | Placeholders |
| **500** | **55%** | **Base color (from hex)** |
| 600 | 45% | Hover states for buttons |
| 700 | 36% | Active states |
| 800 | 27% | Body text |
| 900 | 18% | Headings |
| 950 | 9% | Dark text, high contrast |

### Font Loading

Supported sources:
- ✅ Google Fonts (auto-loaded)
- ✅ System fonts (no loading needed)
- ❌ Custom web fonts (requires manual @font-face)

### Convex Schema

```typescript
branding: v.object({
  logo_url: v.optional(v.string()),
  app_icon_url: v.optional(v.string()),
  primary_color: v.string(),      // Hex: #FF6B9D
  secondary_color: v.string(),
  accent_color: v.string(),
  font_family: v.string(),        // "Roboto, sans-serif"
  custom_css: v.optional(v.string()),
})
```

---

## 🎓 Advanced Usage

### Custom CSS

Add advanced styling in Settings → Branding → Custom CSS:

```css
/* Example: Custom button radius */
.custom-button {
  border-radius: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* Example: Custom heading font */
h1, h2, h3 {
  font-family: 'Playfair Display', serif;
  letter-spacing: -0.02em;
}
```

### Programmatic Theme Access

```tsx
// Get current theme colors
const root = document.documentElement;
const primaryColor = getComputedStyle(root)
  .getPropertyValue('--primary');

// Set theme color
root.style.setProperty('--primary', '200 100% 50%');
```

### Theme Transitions

Add smooth transitions:

```css
* {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease;
}
```

---

## ✨ Summary

1. **Always use theme classes** (`bg-primary`, not `bg-blue-500`)
2. **Semantic classes** for common patterns
3. **Status colors** stay consistent
4. **Fonts auto-load** from Google Fonts
5. **Test thoroughly** after theme changes

**The theme system is production-ready and scales to any branding! 🎨**

---

*Generated by Claude Code - UltraThink Mode*
*Last Updated: 2025-10-15*
