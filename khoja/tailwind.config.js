/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B4332',
          light: '#2D6A4F',
        },
        accent: {
          DEFAULT: '#E76F51',
          light: '#F4A261',
        },
        found: '#2D6A4F',
        lost: '#E63946',
        matched: '#F4A261',
        claimed: '#52B788',
        bg: '#FAFAF8',
        surface: '#FFFFFF',
        muted: '#6B7280',
        border: '#E5E7EB',
        text: '#111827',
        offline: '#B45309',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}