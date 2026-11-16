import type { Config } from 'tailwindcss'
import tokens from '../shared/design-tokens.json'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: tokens.colors,
      borderRadius: tokens.borderRadius,
      spacing: tokens.spacing,
      fontFamily: {
        'heading': ['var(--font-geist)', 'system-ui', 'sans-serif'],
        'body': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'display-lg': ['var(--font-geist)'],
        'display-lg-mobile': ['var(--font-geist)'],
        'headline-md': ['var(--font-geist)'],
        'body-lg': ['var(--font-inter)'],
        'body-md': ['var(--font-inter)'],
        'label-sm': ['var(--font-geist)'],
        'code-sm': ['var(--font-geist)'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '700' }],
        'display-lg-mobile': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-sm': ['13px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '500' }],
        'code-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      maxWidth: {
        'content': '1440px',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pulse-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 5px rgba(6,182,212,0.3))' },
          '50%': { filter: 'drop-shadow(0 0 20px rgba(6,182,212,0.8))' },
        }
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}

export default config
