/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#FAF5F0',
        'brand-secondary': '#5D4742',
        'brand-cream': '#FAF5F0',
        'brand-cacao': '#5D4742',
        'brand-gold': '#C59B76',
        'brand-nude': '#F2DFD8',
        'brand-pearl': '#FFFFFF',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px rgba(93, 71, 66, 0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};