# AfroJamz Color Scheme

## Official Brand Colors

### Primary - Orange/Coral

Main brand color for buttons, CTAs, and primary elements.

| Shade   | Hex Code      | RGB                   | Usage                |
| ------- | ------------- | --------------------- | -------------------- |
| 50      | `#FFF4ED`     | rgb(255, 244, 237)    | Lightest backgrounds |
| 100     | `#FFE6D5`     | rgb(255, 230, 213)    | Light backgrounds    |
| 200     | `#FFC9AA`     | rgb(255, 201, 170)    | Subtle highlights    |
| 300     | `#FFA574`     | rgb(255, 165, 116)    | Light accents        |
| 400     | `#FF7A3C`     | rgb(255, 122, 60)     | Medium accents       |
| **500** | **`#FF6B35`** | **rgb(255, 107, 53)** | **Primary buttons**  |
| **600** | **`#F04E16`** | **rgb(240, 78, 22)**  | **Main brand color** |
| 700     | `#C73B0D`     | rgb(199, 59, 13)      | Hover states         |
| 800     | `#9E3113`     | rgb(158, 49, 19)      | Dark accents         |
| 900     | `#7F2D13`     | rgb(127, 45, 19)      | Darkest              |

### Secondary - Gold/Amber

Complementary color for secondary buttons and accents.

| Shade   | Hex Code      | RGB                   | Usage                    |
| ------- | ------------- | --------------------- | ------------------------ |
| 50      | `#FEF9E7`     | rgb(254, 249, 231)    | Lightest backgrounds     |
| 100     | `#FEF3C3`     | rgb(254, 243, 195)    | Light backgrounds        |
| 200     | `#FDE58A`     | rgb(253, 229, 138)    | Subtle highlights        |
| 300     | `#FCD448`     | rgb(252, 212, 72)     | Light accents            |
| 400     | `#FAC515`     | rgb(250, 197, 21)     | Medium accents           |
| **500** | **`#F7931E`** | **rgb(247, 147, 30)** | **Secondary buttons**    |
| **600** | **`#D86F08`** | **rgb(216, 111, 8)**  | **Main secondary color** |
| 700     | `#B54F0B`     | rgb(181, 79, 11)      | Hover states             |
| 800     | `#923D10`     | rgb(146, 61, 16)      | Dark accents             |
| 900     | `#783311`     | rgb(120, 51, 17)      | Darkest                  |

### Accent - Teal/Turquoise

Highlight color for special elements and call-outs.

| Shade   | Hex Code      | RGB                   | Usage                 |
| ------- | ------------- | --------------------- | --------------------- |
| 50      | `#EDFAFA`     | rgb(237, 250, 250)    | Lightest backgrounds  |
| 100     | `#D5F5F5`     | rgb(213, 245, 245)    | Light backgrounds     |
| 200     | `#AFEBEB`     | rgb(175, 235, 235)    | Subtle highlights     |
| 300     | `#7CDCDC`     | rgb(124, 220, 220)    | Light accents         |
| 400     | `#48C5C5`     | rgb(72, 197, 197)     | Medium accents        |
| **500** | **`#2EC4B6`** | **rgb(46, 196, 182)** | **Accent highlights** |
| **600** | **`#229F93`** | **rgb(34, 159, 147)** | **Main accent color** |
| 700     | `#207D75`     | rgb(32, 125, 117)     | Hover states          |
| 800     | `#20635E`     | rgb(32, 99, 94)       | Dark accents          |
| 900     | `#1F524E`     | rgb(31, 82, 78)       | Darkest               |

## Usage Guidelines

### Backgrounds

- **Page backgrounds**: Light gradients using 50 shades
  - `bg-linear-to-br from-primary-50 via-secondary-50 to-accent-50`
- **Cards/Sections**: White (`bg-white`) with colored borders
- **Stats/Hero sections**: Colored gradients with white text
  - `bg-linear-to-r from-primary-500 via-secondary-500 to-accent-500`

### Text

- **Headings**: `text-gray-900` (dark) or gradient text
  - Gradient: `bg-linear-to-r from-primary-600 via-secondary-600 to-accent-600 bg-clip-text text-transparent`
- **Body text**: `text-gray-700` or `text-gray-600`
- **Muted text**: `text-gray-500`
- **On colored backgrounds**: `text-white`

### Buttons

- **Primary CTA**: `bg-linear-to-r from-primary-500 to-secondary-500 text-white`
- **Secondary**: `border-2 border-primary-500 text-primary-600`
- **Accent**: `bg-accent-500 text-white`

### Interactive Elements

- **Links**: `text-gray-700 hover:text-primary-600`
- **Beat cards**: `hover:border-primary-500`
- **Icons**: Feature icons use gradient backgrounds of their respective colors

## Tailwind v4 Implementation

Colors are defined in `src/frontend/src/index.css` using the `@theme` directive:

```css
@theme {
  --color-primary-500: #ff6b35;
  --color-secondary-500: #f7931e;
  --color-accent-500: #2ec4b6;
  /* ... all other shades */
}
```

## Quick Reference

**Primary**: Orange/Coral (`#FF6B35` / `#F04E16`)  
**Secondary**: Gold/Amber (`#F7931E` / `#D86F08`)  
**Accent**: Teal/Turquoise (`#2EC4B6` / `#229F93`)

## Dark Mode

AfroJamz fully supports dark mode for enhanced user experience in low-light environments. For complete dark mode implementation details, color palettes, and usage guidelines, see:

📖 **[Dark Mode Documentation](./dark-mode.md)**

### Key Dark Mode Colors

- **Backgrounds**: `gray-900`, `gray-800`, `gray-950`
- **Text**: `white`, `gray-300`, `gray-400`
- **Brand Colors**: Remain consistent across both themes

### Quick Dark Mode Reference

```jsx
// Backgrounds
<div className="bg-white dark:bg-gray-800">

// Text
<h1 className="text-gray-900 dark:text-white">
<p className="text-gray-700 dark:text-gray-300">

// Links
<a className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
```
