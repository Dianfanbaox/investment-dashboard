/** WARNING: DON'T EDIT THIS FILE */
/** WARNING: DON'T EDIT THIS FILE */
/** WARNING: DON'T EDIT THIS FILE */

/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        profit: {
          DEFAULT: '#ef4444',
          light: '#fecaca',
          dark: '#991b1b',
        },
        loss: {
          DEFAULT: '#22c55e',
          light: '#bbf7d0',
          dark: '#166534',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          DEFAULT: '#3b82f6',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6',
        },
      },
      spacing: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      fontSize: {
        'data-xs': ['10px', { lineHeight: '1.4' }],
        'data-sm': ['12px', { lineHeight: '1.5' }],
        'data': ['14px', { lineHeight: '1.5' }],
        'data-lg': ['16px', { lineHeight: '1.5' }],
      },
      borderRadius: {
        'card': '0.75rem',
        'button': '0.5rem',
      },
      boxShadow: {
        'card': '0 2px 16px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 28px rgba(0, 0, 0, 0.08)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
