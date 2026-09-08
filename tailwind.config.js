/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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
      },
      animation: {
        'mascot-wave': 'mascot-wave 1.8s ease-in-out infinite',
        'mascot-pop': 'mascot-pop 300ms ease-out 1',
        'mascot-calm': 'mascot-calm 2.4s ease-in-out infinite',
        'mascot-celebrate': 'mascot-celebrate 400ms ease-out 1',
      },
    },
  },
  plugins: [],
};
