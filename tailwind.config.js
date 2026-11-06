/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Paleta propia (06/11/2026). Antes los 5 colores de marca y todos los grises
      // eran valores exactos de fábrica de Tailwind (blue-600, slate-900, gray-500…).
      colors: {
        saro: {
          blue:   '#1F5FE0',
          mid:    '#1B3E9E',
          dark:   '#0D1628',
          light:  '#EEF4FE',
          line:   '#D6E3FB',
          accent: '#F2A516',
        },
        // Neutros fríos teñidos hacia el navy de la marca. Misma luminosidad que
        // los grises de fábrica de cada número, así el contraste no cambia.
        tinta: {
          50:  '#F6F9FE',
          100: '#F1F4F9',
          200: '#E4E8EE',
          300: '#D0D5DD',
          400: '#8E949D',
          500: '#6C727C',
          600: '#4F555E',
          700: '#3A414B',
          800: '#222934',
          900: '#111925',
          950: '#020611',
        },
        // Verde de WhatsApp (botones de pedido y consulta). El 500 da 4,6:1 con
        // texto blanco; el emerald-500 de antes daba 2,5:1.
        wa: {
          50:  '#EAF8F0',
          100: '#CFF0DD',
          200: '#A6E3C1',
          300: '#6FCF9B',
          400: '#34B874',
          500: '#13874D',
          600: '#0E7A45',
          700: '#0B6439',
          800: '#0A4F2E',
          900: '#083D24',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-titulo)', 'Archivo', 'system-ui', 'sans-serif'],
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
