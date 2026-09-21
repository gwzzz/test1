/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        paper: '#FAF6EF',
        'paper-deep': '#F1E9DC',
        ink: '#2B3A4A',
        'ink-soft': '#5A6B78',
        coral: '#E4774F',
        'coral-deep': '#C95E3A',
        moss: '#7C8A6D',
        gold: '#D9A441',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        paper: '0 10px 40px -12px rgba(43,58,74,0.18)',
        lift: '0 24px 54px -20px rgba(43,58,74,0.28)',
      },
    },
  },
  plugins: [],
};