/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'or-navy': '#0F1B3C',
        'or-blue': '#1E3A8A',
        'or-red': '#DC2626',
        'or-green': '#16A34A',
        surface: {
          0: '#030712',
          1: '#060D1F',
          2: '#0A1428',
          3: '#0F1E38',
          4: '#162344',
        },
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(99,102,241,0.15)',
        'glow-md': '0 0 40px rgba(99,102,241,0.20)',
        'glow-lg': '0 0 80px rgba(99,102,241,0.25)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
}
