import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: '#BF2D42',
        // Backgrounds
        'background-light': '#F8FAFC',
        'background-dark': '#211114',
        surface: '#FFFFFF',
        // Text
        'text-main': '#0F172A',
        'text-muted': '#334155',
        // Borders
        'border-soft': '#E2E8F0',
        'border-subtle': '#F1F5F9',
        border: '#E2E8F0',
        'border-light': '#E2E8F0',
        // Accents
        'accent-blue': '#0EA5E9',
        success: '#10B981',
        'success-bg': '#D1FAE5',
        'success-text': '#059669',
        warning: '#F59E0B',
        'warning-bg': '#FEF3C7',
        'warning-text': '#D97706',
        danger: '#EF4444',
        'danger-bg': '#FEE2E2',
        'danger-text': '#DC2626',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        md: '12px',
        lg: '20px',
        xl: '1.5rem',
      },
      boxShadow: {
        soft: '0 20px 40px -10px rgba(15,23,42,0.05)',
        floating: '0 30px 60px -15px rgba(15,23,42,0.08)',
        monitor: '0 10px 30px -5px rgba(15,23,42,0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
