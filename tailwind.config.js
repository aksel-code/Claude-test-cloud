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
        // Signal: the experimental accent for app chrome (nav, headers,
        // loading, transitions). Never used on journal content.
        signal: 'rgb(var(--pb-signal) / <alpha-value>)',
        'signal-deep': 'rgb(var(--pb-signal-deep) / <alpha-value>)',
        'signal-glow': 'rgb(var(--pb-signal-glow) / <alpha-value>)',
        'signal-ember': 'rgb(var(--pb-signal-ember) / <alpha-value>)',
        chrome: 'rgb(var(--pb-chrome) / <alpha-value>)',
        'chrome-ink': 'rgb(var(--pb-chrome-ink) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Fraunces', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // Technical/meta layer — system stack on purpose: the app makes a
        // point of shipping zero third-party network requests for fonts.
        mono: ['ui-monospace', 'SF Mono', 'Cascadia Code', 'Roboto Mono', '"DejaVu Sans Mono"', 'monospace'],
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
        'glitch-in': {
          '0%': { opacity: '0', transform: 'translate3d(0,0,0)', clipPath: 'inset(0 0 100% 0)' },
          '18%': { opacity: '1', transform: 'translate3d(-2px,0,0)', clipPath: 'inset(0 0 62% 0)' },
          '32%': { transform: 'translate3d(2px,0,0)', clipPath: 'inset(0 0 38% 0)' },
          '46%': { transform: 'translate3d(-1px,0,0)', clipPath: 'inset(0 0 14% 0)' },
          '60%': { transform: 'translate3d(1px,0,0)', clipPath: 'inset(0 0 4% 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)', clipPath: 'inset(0 0 0% 0)' },
        },
        'dot-pulse': {
          '0%, 100%': { opacity: 'var(--pb-dot-opacity)' },
          '50%': { opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        // Chromatic-aberration convergence: two colour ghosts fly in from
        // opposite offsets and fade out as they land on the true text,
        // echoing the blue/ember split in the reference moodboard. One-shot,
        // not infinite — a permanently glitching wordmark is a liability,
        // not a flourish.
        'rgb-split-a': {
          '0%': { transform: 'translate3d(-7px, 2px, 0)', opacity: '0.85' },
          '70%': { transform: 'translate3d(-2px, 1px, 0)', opacity: '0.5' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '0' },
        },
        'rgb-split-b': {
          '0%': { transform: 'translate3d(7px, -2px, 0)', opacity: '0.85' },
          '70%': { transform: 'translate3d(2px, -1px, 0)', opacity: '0.5' },
          '100%': { transform: 'translate3d(0, 0, 0)', opacity: '0' },
        },
        // One pixel-reveal cell: solid, then shrinks away to nothing. Staggered
        // per-cell delays (set inline, not here) turn this into a mosaic wipe.
        'pixel-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '60%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 420ms cubic-bezier(0.22, 1.4, 0.36, 1) both',
        'stamp-in': 'stamp-in 380ms cubic-bezier(0.22, 1.4, 0.36, 1) both',
        'fade-up': 'fade-up 300ms cubic-bezier(0.2, 0.8, 0.3, 1) both',
        'sheet-up': 'sheet-up 300ms cubic-bezier(0.2, 0.8, 0.3, 1) both',
        'glitch-in': 'glitch-in 640ms cubic-bezier(0.2, 0.8, 0.3, 1) both',
        'dot-pulse': 'dot-pulse 2.4s ease-in-out infinite',
        blink: 'blink 1.1s step-start infinite',
        'rgb-split-a': 'rgb-split-a 700ms cubic-bezier(0.2, 0.8, 0.3, 1) both',
        'rgb-split-b': 'rgb-split-b 700ms cubic-bezier(0.2, 0.8, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
