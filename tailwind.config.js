/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#e0f3ff',
          100: '#b3dfff',
          200: '#66bfff',
          300: '#2ec6f8',
          400: '#00a8f8',
          500: '#0090fc',
          600: '#0077e6',
          700: '#005ec2',
          800: '#00469e',
          900: '#002f7a',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        card: '0 4px 20px rgba(0, 144, 252, 0.08)',
        'card-hover': '0 8px 30px rgba(0, 144, 252, 0.15)',
      },
    },
  },
  plugins: [],
};
