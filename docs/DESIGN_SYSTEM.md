# AgentDB9 Design System

## Overview

The AgentDB9 design system provides a consistent visual language and reusable components across the application. It's built on design tokens that ensure consistency in colors, spacing, typography, and animations.

## Design Tokens

All design tokens are centralized in `frontend/src/styles/design-tokens.ts`.

### Usage

```typescript
import { designTokens, tailwindTokens } from '@/styles/design-tokens';

// Use in components
const MyComponent = () => (
  <div className={tailwindTokens.glassmorphicCard}>
    <h1 className={tailwindTokens.textPrimary}>Hello</h1>
  </div>
);
```

## Color Palette

### Primary Colors

Our primary palette features a gradient from purple through indigo to blue, creating a modern, tech-forward aesthetic.

```typescript
// Deep colors (backgrounds)
purple-900: #4c1d95
indigo-900: #312e81
blue-900: #1e3a8a

// Medium colors (interactive elements)
purple-500: #a855f7
pink-500: #ec4899
blue-500: #3b82f6

// Light colors (accents, text)
purple-400: #c084fc
purple-300: #d8b4fe
purple-200: #e9d5ff
```

### Gradients

```typescript
// Background gradient
tailwindTokens.gradientPrimary
// "bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900"

// Button gradient
tailwindTokens.gradientButton
// "bg-gradient-to-r from-purple-500 to-pink-500"

// Hover gradient
tailwindTokens.gradientHover
// "bg-gradient-to-r from-purple-400 to-pink-400"
```

### Semantic Colors

```typescript
success: #10b981  // Green
error: #ef4444    // Red
warning: #f59e0b  // Amber
info: #3b82f6     // Blue
```

## Typography

### Font Families

```typescript
sans: 'ui-sans-serif, system-ui, -apple-system, ...'
mono: 'ui-monospace, SFMono-Regular, Menlo, ...'
```

### Font Sizes

```typescript
xs: 0.75rem    // 12px
sm: 0.875rem   // 14px
base: 1rem     // 16px
lg: 1.125rem   // 18px
xl: 1.25rem    // 20px
2xl: 1.5rem    // 24px
3xl: 1.875rem  // 30px
4xl: 2.25rem   // 36px
5xl: 3rem      // 48px
```

### Font Weights

```typescript
normal: 400
medium: 500
semibold: 600
bold: 700
```

## Spacing

Consistent spacing scale based on 4px increments:

```typescript
xs: 0.25rem    // 4px
sm: 0.5rem     // 8px
md: 1rem       // 16px
lg: 1.5rem     // 24px
xl: 2rem       // 32px
2xl: 3rem      // 48px
3xl: 4rem      // 64px
4xl: 6rem      // 96px
```

## Border Radius

```typescript
sm: 0.5rem     // 8px
md: 1rem       // 16px
lg: 1.5rem     // 24px
xl: 2rem       // 32px
2xl: 3rem      // 48px
full: 9999px   // Fully rounded
```

## Glassmorphism

Our signature visual style uses glassmorphic effects for depth and modern aesthetics.

### Glassmorphic Card

```typescript
// Tailwind classes
className={tailwindTokens.glassmorphicCard}
// "bg-white bg-opacity-10 backdrop-blur-2xl rounded-3xl border border-white border-opacity-20"

// CSS-in-JS
const style = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(40px)',
  borderRadius: '3rem',
};
```

### Glassmorphic Input

```typescript
className={tailwindTokens.glassmorphicInput}
// "bg-white bg-opacity-10 rounded-2xl border border-white border-opacity-20 backdrop-blur-sm"
```

## Components

### Input Fields

```typescript
// Standard input
<div className="relative group">
  <div className={`absolute inset-0 ${tailwindTokens.gradientHover} rounded-2xl opacity-0 group-hover:opacity-100 ${tailwindTokens.transitionAll} blur`}></div>
  <div className={`relative ${tailwindTokens.glassmorphicInput} ${tailwindTokens.transitionAll} hover:bg-opacity-15`}>
    <div className="flex items-center px-4 py-4">
      <Mail className={`w-5 h-5 ${tailwindTokens.textAccent} mr-3`} />
      <input
        type="email"
        placeholder="Email address"
        className={`flex-1 bg-transparent ${tailwindTokens.textPrimary} placeholder-purple-300 outline-none`}
      />
    </div>
  </div>
</div>
```

### Buttons

```typescript
// Primary button
<button
  className={`w-full ${tailwindTokens.gradientButton} ${tailwindTokens.textPrimary} font-semibold py-4 rounded-2xl shadow-lg ${tailwindTokens.hoverGlow} transform ${tailwindTokens.hoverScale} ${tailwindTokens.transitionAll}`}
>
  Sign In
</button>

// Secondary button
<button
  className={`${tailwindTokens.glassmorphicInput} py-3 ${tailwindTokens.textPrimary} hover:bg-opacity-20 ${tailwindTokens.transitionAll} transform ${tailwindTokens.hoverScale}`}
>
  Cancel
</button>
```

### Cards

```typescript
// Standard card
<div className={`${tailwindTokens.glassmorphicCard} p-8 shadow-2xl`}>
  <h2 className={tailwindTokens.textPrimary}>Card Title</h2>
  <p className={tailwindTokens.textSecondary}>Card content</p>
</div>
```

## Animations

### Transitions

```typescript
// All properties
className={tailwindTokens.transitionAll}
// "transition-all duration-300"

// Colors only
className={tailwindTokens.transitionColors}
// "transition-colors duration-300"

// Transform only
className={tailwindTokens.transitionTransform}
// "transition-transform duration-300"
```

### Hover Effects

```typescript
// Scale up on hover
className={tailwindTokens.hoverScale}
// "hover:-translate-y-1"

// Glow effect
className={tailwindTokens.hoverGlow}
// "hover:shadow-2xl"

// Brightness increase
className={tailwindTokens.hoverBrightness}
// "hover:bg-opacity-15"
```

### Custom Animations

```typescript
// Floating particles
@keyframes float {
  0%, 100% {
    transform: translateY(0px) translateX(0px);
  }
  50% {
    transform: translateY(-20px) translateX(10px);
  }
}

// Pulse effect (built-in Tailwind)
className="animate-pulse"
```

## Text Styles

```typescript
// Primary text (white)
className={tailwindTokens.textPrimary}
// "text-white"

// Secondary text (light purple)
className={tailwindTokens.textSecondary}
// "text-purple-200"

// Accent text (medium purple)
className={tailwindTokens.textAccent}
// "text-purple-300"
```

## Shadows

```typescript
sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
2xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
glow: '0 0 20px rgba(168, 85, 247, 0.4)'
```

## Responsive Design

### Breakpoints

```typescript
sm: '640px'   // Mobile landscape
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large desktop
```

### Usage

```typescript
// Tailwind responsive classes
<div className="p-4 md:p-8 lg:p-12">
  // Padding increases with screen size
</div>
```

## Accessibility

### Color Contrast

All text colors meet WCAG AA standards for contrast:
- White text on purple-900 background: ✅ AAA
- Purple-200 text on purple-900 background: ✅ AA
- Purple-300 text on purple-900 background: ✅ AA

### Focus States

Always include visible focus indicators:

```typescript
<button className="focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2">
  Button
</button>
```

### ARIA Labels

Include proper ARIA attributes:

```typescript
<input
  aria-label="Email address"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
/>
```

## Best Practices

### 1. Use Design Tokens

❌ Don't hardcode values:
```typescript
<div className="bg-purple-500 rounded-lg p-4">
```

✅ Use design tokens:
```typescript
<div className={tailwindTokens.glassmorphicCard}>
```

### 2. Consistent Spacing

❌ Random spacing:
```typescript
<div className="mt-3 mb-5 px-7">
```

✅ Use spacing scale:
```typescript
<div className="mt-4 mb-6 px-8">
// or
<div style={{ marginTop: designTokens.spacing.md }}>
```

### 3. Reusable Components

Create reusable components for common patterns:

```typescript
// components/ui/GlassmorphicCard.tsx
export const GlassmorphicCard = ({ children, className = '' }) => (
  <div className={`${tailwindTokens.glassmorphicCard} ${className}`}>
    {children}
  </div>
);
```

### 4. Consistent Animations

Use predefined transition classes:

```typescript
// All interactive elements should have transitions
<button className={tailwindTokens.transitionAll}>
```

## Examples

### Login Form (Current Implementation)

See `frontend/src/app/auth/login/page.tsx` for a complete example using the design system.

### Creating a New Page

```typescript
import { tailwindTokens } from '@/styles/design-tokens';

export default function MyPage() {
  return (
    <div className={`min-h-screen ${tailwindTokens.gradientPrimary} p-4`}>
      <div className={`${tailwindTokens.glassmorphicCard} max-w-4xl mx-auto p-8`}>
        <h1 className={`text-4xl font-bold ${tailwindTokens.textPrimary} mb-4`}>
          Page Title
        </h1>
        <p className={tailwindTokens.textSecondary}>
          Page content goes here
        </p>
      </div>
    </div>
  );
}
```

## Future Enhancements

1. **Dark/Light Mode**: Add theme switching capability
2. **Component Library**: Build out complete component library
3. **Storybook**: Add Storybook for component documentation
4. **CSS Variables**: Convert tokens to CSS custom properties
5. **Theme Variants**: Support multiple color schemes

## Resources

- **Design Tokens**: `frontend/src/styles/design-tokens.ts`
- **Example Usage**: `frontend/src/app/auth/login/page.tsx`
- **Tailwind Config**: `frontend/tailwind.config.ts`

## Support

For questions or suggestions about the design system:
1. Review this documentation
2. Check existing implementations
3. Refer to design tokens file
4. Follow established patterns

---

**Version**: 1.0.0
**Last Updated**: 2025-10-12
**Maintained By**: AgentDB9 Team
