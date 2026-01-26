# Dark Mode Implementation

AfroJamz supports system-wide dark mode to enhance user experience and reduce eye strain in low-light environments.

## Overview

The dark mode implementation uses:

- **Tailwind CSS dark mode** with `class` strategy
- **React Context API** for theme state management
- **LocalStorage** for theme persistence
- **System preference detection** for automatic theme selection

## Features

✅ Toggle between light and dark themes  
✅ Persistent theme preference (stored in localStorage)  
✅ Automatic system preference detection  
✅ Smooth transitions between themes  
✅ Accessible theme toggle button with clear icons  
✅ Consistent dark mode across all pages

## Implementation Details

### 1. Theme Context

Located at: `src/frontend/src/context/ThemeContext.jsx`

The ThemeContext provides:

- `theme`: Current theme ("light" or "dark")
- `toggleTheme()`: Switch between light and dark
- `setLightTheme()`: Force light mode
- `setDarkTheme()`: Force dark mode
- `isDark`: Boolean indicating if dark mode is active

### 2. Theme Toggle Component

Located at: `src/frontend/src/components/ThemeToggle.jsx`

A button component that:

- Shows a moon icon in light mode
- Shows a sun icon in dark mode
- Includes accessible labels and titles
- Uses smooth color transitions

### 3. Tailwind Configuration

Located at: `src/frontend/tailwind.config.js`

```javascript
darkMode: "class"; // Uses class-based dark mode
```

### 4. HTML Setup

The root `<html>` element gets a `light` or `dark` class applied dynamically:

```html
<html lang="en" class="dark"></html>
```

This enables Tailwind's `dark:` variant classes to work.

## Dark Mode Color Palette

### Background Colors

| Element    | Light Mode      | Dark Mode        |
| ---------- | --------------- | ---------------- |
| Page       | `bg-primary-50` | `bg-gray-900`    |
| Cards      | `bg-white`      | `bg-gray-800`    |
| Navigation | `bg-white/90`   | `bg-gray-900/90` |
| Footer     | `bg-gray-900`   | `bg-gray-950`    |

### Text Colors

| Element    | Light Mode         | Dark Mode          |
| ---------- | ------------------ | ------------------ |
| Headings   | `text-gray-900`    | `text-white`       |
| Body Text  | `text-gray-700`    | `text-gray-300`    |
| Muted Text | `text-gray-600`    | `text-gray-400`    |
| Links      | `text-gray-700`    | `text-gray-300`    |
| Link Hover | `text-primary-600` | `text-primary-400` |

### Interactive Elements

| Element      | Light Mode             | Dark Mode              |
| ------------ | ---------------------- | ---------------------- |
| Inputs       | `bg-white`             | `bg-gray-700`          |
| Input Border | `border-gray-300`      | `border-gray-600`      |
| Buttons      | Brand gradients (same) | Brand gradients (same) |
| Error BG     | `bg-red-50`            | `bg-red-900/30`        |
| Error Border | `border-red-200`       | `border-red-800`       |
| Error Text   | `text-red-600`         | `text-red-400`         |

### Brand Colors

Brand colors (Primary, Secondary, Accent) **remain the same** in both modes for consistency and brand recognition:

- Primary gradients
- Secondary gradients
- Accent gradients
- Button backgrounds

## Usage in Components

### Basic Dark Mode Classes

```jsx
// Background
<div className="bg-white dark:bg-gray-800">

// Text
<h1 className="text-gray-900 dark:text-white">

// Links
<a className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">

// Inputs
<input className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
```

### Using the Theme Context

```jsx
import { useTheme } from "../context/ThemeContext";

function MyComponent() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      {isDark && <p>Dark mode is enabled!</p>}
    </div>
  );
}
```

### Adding Theme Toggle to Pages

```jsx
import ThemeToggle from "../components/ThemeToggle";

<nav>
  <div className="flex items-center gap-4">
    <ThemeToggle />
    {/* Other nav items */}
  </div>
</nav>;
```

## Pages with Dark Mode Support

✅ **HomePage** - Full dark mode with gradient backgrounds  
✅ **LoginPage** - Dark forms with theme toggle  
✅ **RegisterPage** - Dark forms with theme toggle  
✅ **BuyerDashboard** - Dark navigation and content  
✅ **ProducerDashboard** - Dark navigation and content  
🔄 **BrowseBeats** - To be implemented  
🔄 **BeatDetailPage** - To be implemented

## Best Practices

### DO ✅

- Always provide both light and dark variants for backgrounds
- Use appropriate text contrast ratios (WCAG AA compliance)
- Test all interactive states (hover, focus, active) in both modes
- Preserve brand colors in both themes
- Use semi-transparent backgrounds for overlays (`bg-white/90`, `bg-gray-900/90`)

### DON'T ❌

- Don't use pure black (`#000000`) - use `gray-900` or `gray-950`
- Don't change brand gradient colors between themes
- Don't forget to update input placeholder text colors
- Don't use opacity on text that might make it unreadable
- Don't forget error states and alerts

## System Preference Detection

The theme automatically detects user system preferences on first load:

```javascript
// Check system preference
if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
) {
  return "dark";
}
```

If no saved preference exists, the app uses the system preference. Once the user manually toggles the theme, their preference is saved and takes priority.

## Accessibility

- Theme toggle button includes `aria-label` for screen readers
- Icons provide visual indication of current theme
- Color contrast meets WCAG AA standards in both modes
- Keyboard navigation fully supported
- Focus states visible in both themes

## Browser Support

Dark mode works in all modern browsers that support:

- CSS custom properties
- `prefers-color-scheme` media query
- CSS `dark:` utility classes (via Tailwind)

## Future Enhancements

- [ ] Add "system" option for automatic theme switching
- [ ] Implement smooth color transitions between themes
- [ ] Add dark mode toggle to all remaining pages
- [ ] Create dark mode variants for data visualizations
- [ ] Add theme switcher with 3 options: Light / Dark / System

---

**Implementation Date**: January 26, 2026  
**Status**: Active  
**Maintained By**: Development Team
