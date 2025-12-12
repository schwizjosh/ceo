/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Light theme foundation with lilac undertones
        dark: {
          900: '#fbf7ff',
          800: '#f4efff',
          700: '#ebe5ff',
          600: '#ded9ff',
          500: '#d0cbf5',
          400: '#c1bce8',
          300: '#b0aad8',
          200: '#9b96c6',
          100: '#847fb1'
        },
        // Deep purple-navy core
        primary: {
          900: '#0b0b36',
          800: '#14144b',
          700: '#1d1f61',
          600: '#272b7b',
          500: '#313896',
          400: '#4951b3',
          300: '#6b73ce',
          200: '#97a0e5',
          100: '#c9cff5'
        },
        // Radiant royal purple accents
        purple: {
          900: '#2a0a4f',
          800: '#3a1266',
          700: '#4c1b7f',
          600: '#5f289a',
          500: '#7637b6',
          400: '#9358d0',
          300: '#b07fe2',
          200: '#d0b3f1',
          100: '#efe3ff'
        },
        // Warm neutrals for supporting elements
        earth: {
          900: '#4f2000',
          800: '#7a3606',
          700: '#a24a0d',
          600: '#c65b15',
          500: '#e96d1d',
          400: '#f58b3f',
          300: '#f9a867',
          200: '#ffd0a3',
          100: '#ffe8d1'
        },
        // Glowing orange accent palette
        accent: {
          900: '#7c1f00',
          800: '#a73200',
          700: '#d64505',
          600: '#f75c0b',
          500: '#ff7a1f',
          400: '#ff9a47',
          300: '#ffb973',
          200: '#ffd3a4',
          100: '#ffe9d1'
        },
        // Updated grays tuned for light backgrounds
        gray: {
          50: '#f9f5ff',
          100: '#211d3c',
          200: '#2f2a52',
          300: '#3d3869',
          400: '#4b457f',
          500: '#5a5594',
          600: '#746fa8',
          700: '#938fbe',
          800: '#bcb8d7',
          900: '#e2def0'
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2.5s linear infinite',
        'drift': 'drift 8s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(73, 81, 179, 0.45)' },
          '100%': { boxShadow: '0 0 22px rgba(73, 81, 179, 0.75), 0 0 32px rgba(121, 71, 200, 0.4)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        drift: {
          '0%, 100%': { transform: 'translateX(0px) translateY(0px)' },
          '33%': { transform: 'translateX(10px) translateY(-5px)' },
          '66%': { transform: 'translateX(-5px) translateY(10px)' }
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'dreamy-pattern': 'radial-gradient(circle at 25% 25%, rgba(73, 81, 179, 0.12) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255, 122, 31, 0.08) 0%, transparent 50%)',
        'neural-network': 'linear-gradient(45deg, rgba(73, 81, 179, 0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255, 122, 31, 0.08) 25%, transparent 25%)'
      }
    },
  },
  plugins: [],
};
