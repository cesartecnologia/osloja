import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1440px'
      }
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF'
        },
        ink: '#111827',
        canvas: '#F9FAFB',
        success: '#16A34A',
        warning: '#D97706',
        info: '#2563EB'
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Courier New"', '"Courier Prime"', 'monospace']
      },
      boxShadow: {
        soft: '0 10px 30px rgba(17, 24, 39, 0.08)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
};

export default config;
