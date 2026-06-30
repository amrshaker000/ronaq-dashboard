import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — Tobacco gold-brown from logo text and background
        brand: {
          50: '#FDFCF7',
          100: '#fdebc7', // Secondary background color
          200: '#FBDF9D',
          300: '#D5A44E',
          400: '#9c5c24', // Primary logo text color
          500: '#7B4210',
          600: '#633307',
          700: '#4D2401',
          800: '#371800',
          900: '#260F00',
        },
        // Primary (alias for brand)
        primary: {
          DEFAULT: '#9c5c24',
          foreground: '#FFFFFF',
          light: '#fdebc7',
          dark: '#633307',
        },
        // Surfaces
        surface: {
          DEFAULT: '#FFF8F5',
          dim: '#E4D8D0',
          bright: '#FFF8F5',
          container: {
            lowest: '#FFFFFF',
            low: '#FEF1E9',
            DEFAULT: '#F8ECE3',
            high: '#F2E6DE',
            highest: '#ECE0D8',
          },
        },
        // Semantic
        success: {
          DEFAULT: '#27AE60',
          light: '#E8F8F0',
          dark: '#1E8449',
        },
        warning: {
          DEFAULT: '#F39C12',
          light: '#FEF5E7',
          dark: '#D68910',
        },
        danger: {
          DEFAULT: '#E74C3C',
          light: '#FDEDEC',
          dark: '#C0392B',
        },
        // Neutral
        neutral: {
          bg: '#F8F9FA',
          50: '#F8F9FA',
          100: '#F1F3F5',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#ADB5BD',
          600: '#6C757D',
          700: '#495057',
          800: '#343A40',
          900: '#212529',
        },
        // On-surface
        'on-surface': '#201B16',
        'on-surface-variant': '#514439',
        // Outline
        outline: {
          DEFAULT: '#837467',
          variant: '#D6C3B4',
        },
        // Border
        border: {
          DEFAULT: '#E2E8F0',
          subtle: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'headline-lg': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.02em' }],
      },
      spacing: {
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
        'container-max': '1440px',
        'gutter': '1.5rem',
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(142, 90, 30, 0.08)',
        'popover': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'modal': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      maxWidth: {
        'container': '1440px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
