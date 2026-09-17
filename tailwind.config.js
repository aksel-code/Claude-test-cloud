/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens -> CSS vars so light/dark swap without class churn.
        page: 'rgb(var(--pb-page) / <alpha-value>)',
        surface: 'rgb(var(--pb-surface) / <alpha-value>)',
        raised: 'rgb(var(--pb-raised) / <alpha-value>)',
        sunk: 'rgb(var(--pb-sunk) / <alpha-value>)',
        ink: 'rgb(var(--pb-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--pb-ink-soft) / <alpha-value>)',
        'ink-faint': 'rgb(var(--pb-ink-faint) / <alpha-value>)',
        rule: 'rgb(var(--pb-rule) / <alpha-value>)',
        // Brand accents. `-deep` variants are the ones safe behind white text.
        terracotta: 'rgb(var(--pb-terracotta) / <alpha-value>)',
        'terracotta-deep': 'rgb(var(--pb-terracotta-deep) / <alpha-value>)',
        sage: 'rgb(var(--pb-sage) / <alpha-value>)',
        'sage-deep': 'rgb(var(--pb-sage-deep) / <alpha-value>)',
        dusty: 'rgb(var(--pb-dusty) / <alpha-value>)',
        'dusty-deep': 'rgb(var(--pb-dusty-deep) / <alpha-value>)',
        mustard: 'rgb(var(--pb-mustard) / <alpha-value>)',
        'mustard-deep': 'rgb(var(--pb-mustard-deep) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Fraunces', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        caveat: ['Caveat', 'cursive'],
        patrick: ['"Patrick Hand"', 'cursive'],
        homemade: ['"Homemade Apple"', 'cursive'],
        kalam: ['Kalam', 'cursive'],
        gloria: ['"Gloria Hallelujah"', 'cursive'],
      },
      boxShadow: {
        // Layered, warm-tinted shadows: elements sit ON paper, not float in space.
        paper: '0 1px 1px rgb(43 42 40 / 0.04), 0 3px 8px -2px rgb(43 42 40 / 0.08)',
        lift: '0 2px 3px rgb(43 42 40 / 0.06), 0 10px 22px -6px rgb(43 42 40 / 0.14)',
        float: '0 6px 10px -4px rgb(43 42 40 / 0.10), 0 24px 48px -12px rgb(43 42 40 / 0.22)',
        book: '0 2px 2px rgb(43 42 40 / 0.05), 0 14px 28px -10px rgb(43 42 40 / 0.22), inset -14px 0 18px -14px rgb(43 42 40 / 0.30)',
        inset: 'inset 0 1px 3px rgb(43 42 40 / 0.10)',
      },
      borderRadius: { xs: '3px' },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1.4, 0.36, 1)',
        settle: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.82) rotate(var(--pop-rot, 0deg))', opacity: '0' },
          '55%': { transform: 'scale(1.06) rotate(var(--pop-rot, 0deg))', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(var(--pop-rot, 0deg))', opacity: '1' },
        },
        'stamp-in': {
          '0%': { transform: 'scale(1.5) rotate(-8deg)', opacity: '0' },
          '40%': { transform: 'scale(0.96) rotate(-2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(-2deg)', opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'pop-in': 'pop-in 420ms cubic-bezier(0.22, 1.4, 0.36, 1) both',
        'stamp-in': 'stamp-in 380ms cubic-bezier(0.22, 1.4, 0.36, 1) both',
        'fade-up': 'fade-up 300ms cubic-bezier(0.2, 0.8, 0.3, 1) both',
        'sheet-up': 'sheet-up 300ms cubic-bezier(0.2, 0.8, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
