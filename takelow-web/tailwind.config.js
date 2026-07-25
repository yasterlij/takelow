/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        awash: {
          blue: {
            DEFAULT: '#002B5C',
            light: '#004080',
            dark: '#001F3F',
            foreground: '#FFFFFF',
            bg: '#002B5C',
            bgFrom: '#002B5C',
            bgTo: '#001F3F',
          },
          gold: {
            DEFAULT: '#C8A642',
            light: '#D4B85E',
            dark: '#A68832',
            bg: '#FFF8E7',
            foreground: '#002B5C',
          },
        },
        navy: {
          DEFAULT: '#002B5C',
          light: '#004080',
          dark: '#001F3F',
          foreground: '#FFFFFF',
          muted: '#E5E5E5',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
        primary: {
          DEFAULT: '#C8A642',
          foreground: '#002B5C',
        },
        secondary: {
          DEFAULT: '#F5F5F5',
          foreground: '#002B5C',
        },
        muted: {
          DEFAULT: '#F5F5F5',
          foreground: '#737373',
        },
        accent: {
          DEFAULT: '#FFF8E7',
          foreground: '#A68832',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0A0A0A',
        },
        border: '#E5E5E5',
        input: '#E5E5E5',
        ring: '#C8A642',
        background: '#FAFAFA',
        foreground: '#0A0A0A',
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(200, 166, 66, 0.3)',
        'gold-glow-lg': '0 0 40px rgba(200, 166, 66, 0.4)',
        'blue-glow': '0 0 20px rgba(0, 43, 92, 0.15)',
        'card-hover': '0 8px 24px rgba(0, 43, 92, 0.1)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-down': 'slideDown 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'pulse-ring': 'pulse-ring 2s infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'confetti': 'confetti 0.8s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(200, 166, 66, 0.3)' },
          '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 10px rgba(200, 166, 66, 0)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(200, 166, 66, 0)' },
        },
        breathe: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(200, 166, 66, 0.08)' },
          '50%': { boxShadow: '0 0 40px rgba(200, 166, 66, 0.15)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}