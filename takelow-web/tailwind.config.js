/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        light: {
          bg: '#F5F6F8',
          card: '#ffffff',
          surface: '#F5F6F8',
          border: '#E5E7EB',
          muted: '#6B7280',
          text: '#0F2154',
        },
        navy: {
          DEFAULT: '#0F2154',
          light: '#1B3573',
          dark: '#0A1838',
        },
        orange: {
          DEFAULT: '#F27A18',
          light: '#F79A4E',
          dark: '#D96A10',
        },
        mint: {
          DEFAULT: '#27AE60',
          light: '#4CC97E',
          dark: '#1E8B4C',
        },
        accent: {
          primary: '#F27A18',
          green: '#27AE60',
          gold: '#d97706',
          navy: '#0F2154',
        },
        primary: {
          DEFAULT: '#F27A18',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#EEF0F7',
          foreground: '#0F2154',
        },
        muted: {
          DEFAULT: '#F5F6F8',
          foreground: '#7C829F',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F2154',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F2154',
        },
        border: '#E5E7EB',
        input: '#E5E7EB',
        ring: '#F27A18',
        background: '#F5F6F8',
        foreground: '#0F2154',
        'navy-foreground': '#FFFFFF',
      },
    },
  },
  plugins: [],
};
