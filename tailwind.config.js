/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './views/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      // "Graph paper & highlighter" design system. Colors are RGB triplets
      // defined in index.css and flip under .dark, so `bg-accent` etc. adapt
      // to dark mode without a `dark:` variant. Opacity modifiers work via
      // <alpha-value>.
      colors: {
        paper: 'rgb(var(--paper-rgb) / <alpha-value>)',
        sheet: 'rgb(var(--sheet-rgb) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft-rgb) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint-rgb) / <alpha-value>)',
          // Fixed dark ink for text sitting on the highlighter accent —
          // the same in both modes so yellow always carries dark letters.
          onAccent: 'rgb(var(--ink-on-accent-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          deep: 'rgb(var(--accent-deep-rgb) / <alpha-value>)',
        },
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
        error: 'rgb(var(--error-rgb) / <alpha-value>)',
        info: 'rgb(var(--info-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '10px',
        '2xl': '14px',
      },
      boxShadow: {
        // A sheet of paper resting on the desk — reserved for the puzzle board.
        sheet: '0 2px 6px rgb(15 23 32 / 0.08), 0 12px 32px rgb(15 23 32 / 0.12)',
        'sheet-dark': '0 2px 6px rgb(0 0 0 / 0.4), 0 12px 32px rgb(0 0 0 / 0.45)',
      },
    },
  },
  plugins: [],
}
