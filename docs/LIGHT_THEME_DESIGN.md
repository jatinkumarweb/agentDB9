# Light Theme Design System

## Overview

The login page has been updated with a modern light theme design featuring pastel gradients, animated liquid blobs, and enhanced glassmorphism effects.

## Design Principles

### Color Palette

#### Background Gradient
- **From**: `#eff6ff` (blue-50)
- **Via**: `#ecfdf5` (emerald-50)
- **To**: `#faf5ff` (purple-50)

#### Animated Blobs
1. **Blob 1 (Blue/Cyan)**
   - From: `#93c5fd` (blue-300)
   - To: `#a5f3fc` (cyan-200)
   - Animation: 25s ease-in-out infinite

2. **Blob 2 (Purple/Pink)**
   - From: `#d8b4fe` (purple-300)
   - To: `#fbcfe8` (pink-200)
   - Animation: 30s ease-in-out infinite

3. **Blob 3 (Emerald/Teal)**
   - From: `#6ee7b7` (emerald-300)
   - To: `#99f6e4` (teal-200)
   - Animation: 28s ease-in-out infinite

4. **Blob 4 (Indigo/Blue)**
   - From: `#c7d2fe` (indigo-200)
   - To: `#bfdbfe` (blue-200)
   - Animation: 32s ease-in-out infinite

#### Text Colors
- **Primary**: `#111827` (gray-900)
- **Secondary**: `#4b5563` (gray-600)
- **Accent**: `#4f46e5` (indigo-600)

#### Button Gradient
- **From**: `#4f46e5` (indigo-600)
- **To**: `#9333ea` (purple-600)

### Glassmorphism Effects

#### Card
```css
background: rgba(255, 255, 255, 0.4);
backdrop-filter: blur(40px);
border: 1px solid rgba(255, 255, 255, 0.6);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
```

#### Input Fields
```css
background: rgba(255, 255, 255, 0.5);
backdrop-filter: blur(8px);
border: 1px solid rgba(255, 255, 255, 0.8);
```

### Typography
- **Font Family**: Inter, sans-serif
- **Heading**: 36px, bold, gray-900
- **Body**: 14px, regular, gray-600
- **Button**: 16px, semibold, white

### Animations

#### Blob Animations
Very slow, organic movements to create a calming, fluid effect:

```css
@keyframes blob1 {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}
```

Each blob has a unique animation pattern with different durations (25s, 30s, 28s, 32s) to create natural, non-repetitive movement.

#### Hover Effects
- **Buttons**: Slight lift (-0.5px translateY) with shadow enhancement
- **Inputs**: Background opacity increase and border color change
- **Links**: Color transition to indigo-600/800

### Noise Texture Overlay

A subtle noise texture is applied to the background for a matte, premium feel:

```css
opacity: 0.03;
background-image: url("data:image/svg+xml,...");
```

## Gradient Color Picker Dev Tool

### Features

The gradient color picker is a development tool that allows real-time customization of:

1. **Background Gradient Colors**
   - From color
   - Via color
   - To color

2. **Blob Gradient Colors**
   - Each of the 4 blobs can be customized independently
   - Both "from" and "to" colors for each gradient

3. **Export Options**
   - Copy CSS: Get raw CSS gradient definitions
   - Copy Tailwind: Get Tailwind CSS class syntax

### Usage

1. The tool is only available in development mode (`NODE_ENV === 'development'`)
2. Click the "🎨 Open Gradient Color Picker" button at the bottom of the login page
3. Adjust colors using:
   - Color picker inputs
   - Hex code text inputs
4. Changes apply in real-time to the page
5. Copy the generated CSS or Tailwind classes
6. Minimize the tool to a floating button when not in use

### Implementation

The tool uses data attributes to target elements:
- `data-gradient-bg`: Background gradient container
- `data-blob="1"`, `data-blob="2"`, etc.: Individual blob elements

## Design Tokens

### Tailwind CSS Classes

```typescript
// Light theme tokens
lightGradientPrimary: 'bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50'
lightGradientButton: 'bg-gradient-to-r from-indigo-600 to-purple-600'
lightGradientHover: 'bg-gradient-to-r from-indigo-200 to-purple-200'
lightGlassmorphicCard: 'bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60'
lightGlassmorphicInput: 'bg-white/50 backdrop-blur-sm rounded-2xl border border-white/80'
lightTextPrimary: 'text-gray-900'
lightTextSecondary: 'text-gray-600'
lightTextAccent: 'text-indigo-600'
```

### CSS Variables

```css
--light-bg-from: #eff6ff;
--light-bg-via: #ecfdf5;
--light-bg-to: #faf5ff;
--light-blob1-from: #93c5fd;
--light-blob1-to: #a5f3fc;
--light-blob2-from: #d8b4fe;
--light-blob2-to: #fbcfe8;
--light-blob3-from: #6ee7b7;
--light-blob3-to: #99f6e4;
--light-blob4-from: #c7d2fe;
--light-blob4-to: #bfdbfe;
```

## Accessibility

- High contrast text (gray-900 on light backgrounds)
- ARIA labels on all interactive elements
- Focus states with indigo-500 ring
- Error messages with proper ARIA attributes
- Keyboard navigation support

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (backdrop-filter requires -webkit- prefix)
- Mobile browsers: Full support

## Performance Considerations

1. **Animations**: Very slow animations (25-32s) reduce CPU usage
2. **Blur Effects**: Backdrop-filter is GPU-accelerated
3. **Blend Modes**: mix-blend-multiply is hardware-accelerated
4. **Opacity**: Used instead of rgba for better performance

## Chat Page Implementation

The chat interface has been updated with the same light theme design system:

### Features

1. **Glassmorphic Sidebar**
   - Agent selector with glass effect
   - Conversation list with hover states
   - User info section with gradient avatar

2. **Main Chat Area**
   - Glass card container with noise texture
   - Animated liquid blobs in background
   - WebSocket connection status badge

3. **Message Styling**
   - User messages: Gradient background (indigo-600 to purple-600)
   - Agent messages: Glass input effect with light background
   - Thinking dots animation for streaming responses
   - Metadata display (response time, execution time)

4. **Input Area**
   - Glass input effect with focus states
   - Gradient send button
   - Connection status indicator

5. **Gradient Color Picker**
   - Available in development mode
   - Real-time color customization
   - Positioned at bottom-left corner

### Test Coverage

#### Unit Tests (`page.test.tsx`)
- Light theme styling verification
- Gradient color picker functionality
- Sidebar and chat interface styling
- Message and input styling
- Animation keyframes
- Responsive design
- Loading and error states
- Accessibility features

#### E2E Tests (`page.e2e.test.ts`)
- Visual design verification
- Gradient color picker interactions
- Sidebar interactions (agent selection, new chat, logout)
- Chat interface functionality
- Message sending and receiving
- Responsive design across devices
- Animation performance
- Accessibility compliance
- Performance metrics

### Running Tests

```bash
# Unit tests
cd frontend
npm test -- src/app/chat/__tests__/page.test.tsx

# E2E tests (requires Playwright)
npm run test:e2e -- src/app/chat/__tests__/page.e2e.test.ts
```

## Future Enhancements

1. Theme toggle (light/dark mode)
2. Preset color schemes
3. Animation speed controls
4. Export to design tokens file
5. Accessibility contrast checker
6. Mobile-optimized gradient picker
7. Custom blob shapes and patterns
8. Particle effects customization
9. Sound effects for interactions
10. Theme persistence in localStorage
