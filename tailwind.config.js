/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1e40af',
          light: '#60a5fa'
        },
        secondary: {
          DEFAULT: '#9333ea',
          dark: '#701a75',
          light: '#a855f7'
        }
      }
    }
  },
  plugins: []
};
