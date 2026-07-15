/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        saro: {
          blue:   '#2563EB',
          mid:    '#1E40AF',
          dark:   '#0F172A',
          light:  '#EFF6FF',
          accent: '#F59E0B',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.06)',
        'card-hover': '0 8px 30px rgba(37,99,235,.12), 0 2px 8px rgba(15,23,42,.08)',
        'float': '0 20px 60px rgba(15,23,42,.12), 0 4px 16px rgba(15,23,42,.06)',
      },
      animation: {
        'fade-in': 'fadeIn .3s ease-out',
        'slide-up': 'slideUp .4s cubic-bezier(.16,1,.3,1)',
        'slide-right': 'slideRight .3s cubic-bezier(.16,1,.3,1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
