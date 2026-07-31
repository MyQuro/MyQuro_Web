# MyQuro Design System - Quick Reference

## Color Palette (Red & White Canvas)

### Primary Colors
- `--color-primary-red: #D32F2F` - Primary actions, brand identity
- `--color-primary-red-dark: #B71C1C` - Hover states, emphasis
- `--color-primary-red-light: #FDEAEA` - Backgrounds, subtle highlights

### Neutral Colors
- `--color-white: #FFFFFF` - Base background
- `--color-gray-50: #F9FAFB` - Subtle backgrounds
- `--color-gray-100: #F3F4F6` - Card backgrounds
- `--color-gray-200: #E5E7EB` - Borders, dividers
- `--color-gray-300: #D1D5DB` - Disabled states

### Text Colors
- `--color-text-primary: #111827` - Main content
- `--color-text-secondary: #6B7280` - Secondary text
- `--color-text-disabled: #9CA3AF` - Disabled text

### Semantic Colors
- `--color-success: #16A34A` - Success states
- `--color-warning: #F59E0B` - Warning states
- `--color-error: #DC2626` - Error states
- `--color-info: #2563EB` - Informational states

## Spacing System

```
--spacing-micro: 4px      // Tight spacing
--spacing-tight: 8px      // Icon gaps
--spacing-compact: 12px   // Small padding
--spacing-default: 16px   // Default spacing
--spacing-section: 24px   // Between sections
--spacing-major: 32px     // Large gaps
--spacing-page: 48px      // Page padding
--spacing-hero: 64px      // Hero sections
```

## Typography Scale

| Element  | Mobile    | Desktop   | Weight | Usage              |
|----------|-----------|-----------|--------|--------------------|
| H1       | 36-48px   | 48-72px   | 700    | Hero titles        |
| H2       | 28-36px   | 36-48px   | 600    | Page titles        |
| H3       | 22-28px   | 28-36px   | 600    | Section titles     |
| H4       | 18-22px   | 22-28px   | 600    | Card titles        |
| Body     | 16px      | 16-18px   | 400    | Main text          |
| Small    | 14px      | 14-16px   | 400    | Helper text        |
| Caption  | 12px      | 12-14px   | 400    | Meta information   |

## Button Styles

### Primary Button
```css
.btn-primary
- Background: #D32F2F
- Hover: #B71C1C
- Min Height: 48px (mobile), 56px (desktop)
- Border Radius: 12px
- Shadow: lg
```

### Secondary Button
```css
.btn-secondary
- Background: white
- Border: 2px #E5E7EB
- Hover: #F9FAFB background
```

### Outline Button
```css
.btn-outline
- Border: 2px #D32F2F
- Hover Background: #FDEAEA
```

## Component Patterns

### Card
```css
.card
- Background: white
- Border: 1px #E5E7EB
- Border Radius: 12-16px
- Shadow: sm -> lg on hover
- Padding: 16px (mobile), 24px (desktop)
```

### Input Fields
```css
.form-input
- Min Height: 48px
- Border: 2px #E5E7EB
- Focus: 2px #D32F2F with 4px shadow ring
- Border Radius: 12px
```

## Accessibility Guidelines

### Touch Targets
- Minimum: 44x44px
- Recommended: 48x48px (mobile), 56x56px (desktop)

### Contrast Ratios
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

### Focus States
- Always visible
- 2px outline with 2px offset
- Color: #D32F2F
- Additional 4px ring in light red

## Responsive Breakpoints

```
Mobile:    < 640px   (sm)
Tablet:    640-1024px (md, lg)
Desktop:   > 1024px  (xl, 2xl)
```

## Mobile-First Principles

1. **Design mobile first, scale up**
2. **Touch targets minimum 44px**
3. **No hidden features on mobile**
4. **Stack vertically on mobile**
5. **Horizontal scroll for overflow content**
6. **Bottom sticky CTAs allowed**

## Animation Guidelines

### Durations
- Micro interactions: 150-200ms
- Standard transitions: 200-300ms
- Complex animations: 300-500ms

### Easing
- `ease-out`: Entering elements
- `ease-in`: Exiting elements
- `ease-in-out`: Moving elements

### Respect User Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Component Classes

### Utility Classes
```css
.container-responsive - Full width container with padding
.section-spacing - Responsive section padding
.heading-hero - Hero heading sizes
.heading-page - Page title sizes
.heading-section - Section title sizes
.text-body - Body text sizes
.skeleton - Loading skeleton
.sr-only - Screen reader only
.focus-visible-enhanced - Enhanced focus states
```

## Best Practices

### DO ✅
- Use design system colors consistently
- Maintain minimum touch target sizes
- Provide alternative text for images
- Use semantic HTML
- Test with keyboard navigation
- Test with screen readers
- Design mobile-first
- Use consistent spacing

### DON'T ❌
- Use red for large text blocks
- Rely on color alone for information
- Create touch targets smaller than 44px
- Remove focus indicators
- Use ALL CAPS for long text
- Stack buttons too close together
- Forget aria-labels for icons
- Use justified text alignment

## Implementation Example

```tsx
// Good Example
<button className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-semibold py-4 px-8 rounded-xl transition-all min-h-[56px] shadow-lg hover:shadow-xl">
  Primary Action
</button>

// Card Component
<div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm hover:shadow-lg transition-all">
  <h3 className="text-xl font-semibold text-[#111827] mb-2">Card Title</h3>
  <p className="text-base text-[#6B7280] leading-relaxed">Card content goes here.</p>
</div>
```

---

**Version:** 1.0  
**Last Updated:** December 2025  
**Platform:** MyQuro Restaurant Platform
