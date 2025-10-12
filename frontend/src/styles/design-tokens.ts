/**
 * Design Tokens for AgentDB9
 * 
 * Centralized design system tokens that can be used across the application.
 * These tokens ensure consistency in colors, spacing, typography, and animations.
 */

export const designTokens = {
  // Color Palette
  colors: {
    // Primary gradient colors (dark theme)
    primary: {
      purple: {
        900: '#4c1d95', // Deep purple
        500: '#a855f7', // Medium purple
        400: '#c084fc', // Light purple
        300: '#d8b4fe', // Very light purple
        200: '#e9d5ff', // Pale purple
      },
      indigo: {
        900: '#312e81', // Deep indigo
        600: '#4f46e5', // Solid indigo
        500: '#6366f1', // Medium indigo
        400: '#818cf8', // Light indigo
        200: '#c7d2fe', // Very light indigo
      },
      blue: {
        900: '#1e3a8a', // Deep blue
        500: '#3b82f6', // Medium blue
        300: '#93c5fd', // Light blue
        200: '#bfdbfe', // Very light blue
        50: '#eff6ff',  // Pale blue
      },
      pink: {
        500: '#ec4899', // Medium pink
        400: '#f472b6', // Light pink
        300: '#f9a8d4', // Very light pink
        200: '#fbcfe8', // Pale pink
      },
    },

    // Light theme colors
    light: {
      blue: {
        50: '#eff6ff',
        200: '#bfdbfe',
        300: '#93c5fd',
      },
      cyan: {
        200: '#a5f3fc',
      },
      emerald: {
        50: '#ecfdf5',
        300: '#6ee7b7',
      },
      teal: {
        200: '#99f6e4',
      },
      purple: {
        50: '#faf5ff',
        300: '#d8b4fe',
        600: '#9333ea',
      },
      indigo: {
        200: '#c7d2fe',
        600: '#4f46e5',
      },
      pink: {
        200: '#fbcfe8',
      },
      gray: {
        50: '#f9fafb',
        300: '#d1d5db',
        400: '#9ca3af',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },
    },

    // Neutral colors
    neutral: {
      white: '#ffffff',
      black: '#000000',
      transparent: 'transparent',
    },

    // Semantic colors
    semantic: {
      success: '#10b981', // Green
      error: '#ef4444', // Red
      warning: '#f59e0b', // Amber
      info: '#3b82f6', // Blue
    },

    // Background gradients
    gradients: {
      // Dark theme gradients
      primary: 'linear-gradient(to bottom right, #4c1d95, #312e81, #1e3a8a)',
      button: 'linear-gradient(to right, #a855f7, #ec4899)',
      hover: 'linear-gradient(to right, #c084fc, #f472b6)',
      
      // Light theme gradients
      lightBackground: 'linear-gradient(to bottom right, #eff6ff, #ecfdf5, #faf5ff)',
      lightButton: 'linear-gradient(to right, #4f46e5, #9333ea)',
      lightHover: 'linear-gradient(to right, #818cf8, #d8b4fe)',
    },
  },

  // Spacing scale (in rem)
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '6rem',    // 96px
  },

  // Border radius
  borderRadius: {
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    full: '9999px',   // Fully rounded
  },

  // Typography
  typography: {
    fontFamily: {
      sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: '0 0 20px rgba(168, 85, 247, 0.4)',
  },

  // Opacity
  opacity: {
    0: '0',
    10: '0.1',
    20: '0.2',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    80: '0.8',
    90: '0.9',
    100: '1',
  },

  // Transitions
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    verySlow: '1000ms',
  },

  // Animation durations
  animations: {
    pulse: '2s',
    float: '5s',
    spin: '1s',
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
  },

  // Breakpoints (for responsive design)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Component-specific tokens
  components: {
    input: {
      height: '3rem',           // 48px
      padding: '1rem',          // 16px
      borderRadius: '1.5rem',   // 24px
      fontSize: '1rem',         // 16px
    },
    button: {
      height: '3rem',           // 48px
      padding: '1rem 2rem',     // 16px 32px
      borderRadius: '1.5rem',   // 24px
      fontSize: '1rem',         // 16px
    },
    card: {
      padding: '2rem',          // 32px
      borderRadius: '1.5rem',   // 24px
      backdropBlur: '40px',
    },
  },

  // Glassmorphism effects
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
    backdropBlur: 'blur(40px)',
    backdropBlurStrong: 'blur(80px)',
  },
} as const;

// Type-safe token access
export type DesignTokens = typeof designTokens;

// Helper functions for common patterns
export const getGradientBackground = () => designTokens.colors.gradients.primary;
export const getButtonGradient = () => designTokens.colors.gradients.button;
export const getGlassmorphicStyle = () => ({
  background: designTokens.glassmorphism.background,
  border: `1px solid ${designTokens.glassmorphism.border}`,
  backdropFilter: designTokens.glassmorphism.backdropBlur,
});

// CSS-in-JS helper
export const createGlassmorphicCard = () => `
  background: ${designTokens.glassmorphism.background};
  border: 1px solid ${designTokens.glassmorphism.border};
  backdrop-filter: ${designTokens.glassmorphism.backdropBlur};
  border-radius: ${designTokens.borderRadius['2xl']};
  padding: ${designTokens.spacing['2xl']};
  box-shadow: ${designTokens.shadows['2xl']};
`;

// Tailwind CSS class helpers
export const tailwindTokens = {
  // Dark theme - Gradient backgrounds
  gradientPrimary: 'bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900',
  gradientButton: 'bg-gradient-to-r from-purple-500 to-pink-500',
  gradientHover: 'bg-gradient-to-r from-purple-400 to-pink-400',
  
  // Dark theme - Glassmorphic card
  glassmorphicCard: 'bg-white bg-opacity-10 backdrop-blur-2xl rounded-3xl border border-white border-opacity-20',
  
  // Dark theme - Input field
  glassmorphicInput: 'bg-white bg-opacity-10 rounded-2xl border border-white border-opacity-20 backdrop-blur-sm',
  
  // Dark theme - Text colors
  textPrimary: 'text-white',
  textSecondary: 'text-purple-200',
  textAccent: 'text-purple-300',
  
  // Light theme - Gradient backgrounds
  lightGradientPrimary: 'bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50',
  lightGradientButton: 'bg-gradient-to-r from-indigo-600 to-purple-600',
  lightGradientHover: 'bg-gradient-to-r from-indigo-200 to-purple-200',
  
  // Light theme - Glassmorphic card
  lightGlassmorphicCard: 'bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
  
  // Light theme - Input field
  lightGlassmorphicInput: 'bg-white/50 backdrop-blur-sm rounded-2xl border border-white/80',
  
  // Light theme - Text colors
  lightTextPrimary: 'text-gray-900',
  lightTextSecondary: 'text-gray-600',
  lightTextAccent: 'text-indigo-600',
  
  // Transitions
  transitionAll: 'transition-all duration-300',
  transitionColors: 'transition-colors duration-300',
  transitionTransform: 'transition-transform duration-300',
  
  // Hover effects
  hoverScale: 'hover:-translate-y-1',
  hoverGlow: 'hover:shadow-2xl',
  hoverBrightness: 'hover:bg-opacity-15',
  
  // Light theme hover effects
  lightHoverScale: 'hover:-translate-y-0.5',
  lightHoverGlow: 'hover:shadow-xl',
  lightHoverBrightness: 'hover:bg-white/60',
};

export default designTokens;
