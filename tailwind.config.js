/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /**
       * CR-09 design system (design-spec section 14). `font-display` is
       * Baloo 2 - self-hosted under public/fonts/baloo-2 (OFL-1.1), loaded
       * via @font-face in index.css; system-ui fallback keeps headings
       * readable before the font arrives (font-display: swap).
       */
      fontFamily: {
        display: ['"Baloo 2"', 'system-ui', 'sans-serif'],
        // CR-14: shared VieSchool body face - same Be Vietnam Pro as the
        // landing page and teacher apps (self-hosted woff2 in index.css).
        sans: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // CR-82 (DESIGN-SPEC-v5 s8): Andika for G1-2 letter surfaces
        // (tracing models, spell tiles, flashcard word) - single-story
        // a/g matching grade-1 handwriting. Vendored under
        // /fonts/andika/ at weight 700 only (D-12).
        letter: ['Andika', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      /**
       * CR-82 (DESIGN-SPEC-v5 s4): named navy/desk ramps so new tokens
       * stop spelling arbitrary hex. Values are the already-shipped hex -
       * no new brand colors.
       */
      colors: {
        navy: {
          950: '#0b1224',
          900: '#101a36',
          850: '#0E1F42',
          800: '#162C55',
          700: '#1d3465',
          650: '#24406f',
          600: '#2a4a82',
          500: '#3b5280',
          rim: '#2a3a5e',
          base: '#0a1730',
          chrome: '#0B1B3A',
        },
        desk: {
          DEFAULT: '#0d1b26',
          bar: '#132433',
          well: '#0a1520',
          card: '#16232e',
          line: '#22303d',
        },
      },
      /**
       * CR-82 (DESIGN-SPEC-v5 s5.4): motion primitives. The toy spring
       * easing is restricted to press-release + snap-in (R-v5-05);
       * everything else uses out-quint / out-expo / in-out-soft.
       */
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.22,1,0.36,1)',
        'out-expo': 'cubic-bezier(0.16,1,0.3,1)',
        'in-out-soft': 'cubic-bezier(0.65,0,0.35,1)',
        toy: 'cubic-bezier(0.34,1.30,0.64,1)',
      },
      transitionDuration: {
        80: '80ms',
        160: '160ms',
        240: '240ms',
        400: '400ms',
      },
      /**
       * Pig mascot (🐷) animations (plan.md v10 "App-Wide Mascot"). Every
       * keyframe animates only `transform`/`opacity` (never layout-affecting
       * properties, per plan.md's explicit constraint) and stays within the
       * guide-ui-ux animation budget (150-300ms micro-interactions, <=400ms
       * complex transitions). Paired with `motion-reduce:animate-none` at
       * every call site so `prefers-reduced-motion: reduce` disables them.
       */
      keyframes: {
        'mascot-wave': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-8deg)' },
          '75%': { transform: 'rotate(8deg)' },
        },
        'mascot-pop': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
        'mascot-calm': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        'mascot-celebrate': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '40%': { transform: 'translateY(-10px) scale(1.1)' },
          '70%': { transform: 'translateY(0) scale(1.05)' },
        },
        // CR-09 DS 14.5: screen/card entry - 200ms fade + 8px rise,
        // transform/opacity only, paired with motion-reduce at call sites.
        'screen-enter': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // CR-82 (DESIGN-SPEC-v5 s5.4): toy press-release spring -
        // transform only (R-v5-05).
        'press-release': {
          '0%': { transform: 'translateY(6px)' },
          '60%': { transform: 'translateY(-1px)' },
          '100%': { transform: 'translateY(0)' },
        },
        // CR-82: tile snap into a drag slot. transform only.
        'snap-in': {
          '0%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        // CR-82: streak burst ring behind the sheet perch.
        'streak-burst': {
          '0%': { transform: 'scale(0.6)', opacity: '0.9' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        // CR-82: gold star fly from the answered tile to LiveScore,
        // along --fx/--fy custom properties.
        'star-fly': {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '100%': {
            transform: 'translate(var(--fx, 0px), var(--fy, 0px)) scale(0.5)',
            opacity: '0',
          },
        },
        // CR-82: hero scene far-layer drift (60s alternate).
        'scene-drift-far': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(18px)' },
        },
        // CR-82: journey reset crossfade for scene L2/L3 on round change.
        'scene-reset-fade': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'mascot-wave': 'mascot-wave 1.8s ease-in-out infinite',
        'mascot-pop': 'mascot-pop 300ms ease-out 1',
        'mascot-calm': 'mascot-calm 2.4s ease-in-out infinite',
        'mascot-celebrate': 'mascot-celebrate 400ms ease-out 1',
        'screen-enter': 'screen-enter 200ms ease-out',
        'press-release': 'press-release 240ms cubic-bezier(0.34,1.30,0.64,1)',
        'snap-in': 'snap-in 180ms cubic-bezier(0.34,1.30,0.64,1)',
        'streak-burst': 'streak-burst 520ms cubic-bezier(0.22,1,0.36,1)',
        'star-fly': 'star-fly 600ms cubic-bezier(0.16,1,0.3,1) both',
        'scene-drift-far': 'scene-drift-far 60s cubic-bezier(0.65,0,0.35,1) infinite alternate',
        'scene-reset-fade': 'scene-reset-fade 400ms ease-out',
      },
    },
  },
  plugins: [],
};
