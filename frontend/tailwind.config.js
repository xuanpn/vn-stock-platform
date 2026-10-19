/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        buy:       '#00c087',
        strongbuy: '#00e676',
        watch:     '#ffc107',
        avoid:     '#ef5350',
        dark:      '#0d1117',
        card:      '#161b22',
        border:    '#30363d',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
