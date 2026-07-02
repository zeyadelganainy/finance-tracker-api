/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        app: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        // Text
        ink: {
          DEFAULT: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          faint: 'var(--text-faint)',
        },
        // Borders (also usable as bg/text where needed)
        line: {
          DEFAULT: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        // Accent (theme-aware gold by default, overridable)
        accent: {
          DEFAULT: 'var(--accent-color)',
          hover: 'var(--accent-color-hover)',
          soft: 'var(--accent-soft)',
          contrast: 'var(--accent-contrast)',
        },
        // Semantic states
        success: 'var(--success)',
        danger: 'var(--danger)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '8px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      letterSpacing: {
        tightest: '-0.02em',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out both',
        'rise-in': 'rise-in 220ms ease-out both',
      },
    },
  },
  plugins: [],
}
