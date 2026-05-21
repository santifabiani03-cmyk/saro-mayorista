/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        saro: {
          blue:  '#4A90D9',
          mid:   '#2a5f9e',
          dark:  '#1e3a5f',
          light: '#e8f1fb',
        },
      },
    },
  },
  plugins: [],
}
