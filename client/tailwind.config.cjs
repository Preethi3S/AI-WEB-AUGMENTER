/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a'
        },
        aurora: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2'
        },
        ember: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316'
        }
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(103,232,249,.18), 0 24px 80px rgba(15,23,42,.45)'
      },
      backgroundImage: {
        'grid-radial': 'radial-gradient(circle at top, rgba(34,211,238,.18), transparent 45%), linear-gradient(180deg, rgba(15,23,42,.98), rgba(15,23,42,.92))'
      }
    }
  },
  plugins: []
};