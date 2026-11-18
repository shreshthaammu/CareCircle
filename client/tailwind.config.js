/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      gridTemplateColumns: {
        '15': 'repeat(15, minmax(0, 1fr))',
      },
      colors: {
        // Soft Teal Palette
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488', // Core Brand Primary
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Warm Sand Palette
        sand: {
          50: '#fdfbf7', // Gentle card background
          100: '#f7f3ea', // Page background
          200: '#ede4d4', // Borders & dividers
          300: '#dfd2ba',
          400: '#cfbc9a',
          500: '#ba9f77',
          600: '#9d7f58',
          700: '#7e6444',
          800: '#644f37',
          900: '#483928',
        },
        // Confident Accent (Warm Coral / Terracotta)
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Focus / badge accent
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
        },
      },
      fontSize: {
        'body-sm': ['15px', '22px'],
        'body-base': ['17px', '27px'],
        'body-lg': ['19px', '29px'],
        'elder-body': ['22px', '32px'],
        'elder-heading': ['32px', '40px'],
        'elder-hero': ['40px', '48px'],
      },
      minHeight: {
        'touch': '44px',
        'touch-elder': '56px',
      },
      minWidth: {
        'touch': '44px',
        'touch-elder': '56px',
      },
      borderRadius: {
        'card': '16px',
        'elder': '20px',
      },
      boxShadow: {
        'gentle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'elevated': '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 4px 10px -4px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
