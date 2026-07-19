/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tomato: {
          50: '#fff5f5',
          100: '#ffe3e3',
          200: '#ffc9c9',
          300: '#ffa8a8',
          400: '#ff8787',
          500: '#e03131',
          600: '#c92a2a',
          700: '#a61e1e',
          800: '#862e2e',
          900: '#5c1a1a',
        },
        break: {
          light: '#8ce99a',
          DEFAULT: '#40c057',
          dark: '#2f9e44',
        },
      },
      fontFamily: {
        mono: ['"VT323"', '"Courier New"', 'Courier', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(224, 49, 49, 0.35)',
        'glow-green': '0 0 24px rgba(64, 192, 87, 0.35)',
      },
    },
  },
  plugins: [],
}
