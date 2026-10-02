/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // dùng class "dark" do ThemeToggle gắn vào <html>
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },

        // Màu theo theme (tự đổi khi light/dark), lấy từ CSS variables trong theme.tsx
        app: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
          hover: 'var(--surface-hover)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        ink: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
          onbrand: 'var(--text-on-brand)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          soft: 'var(--primary-soft)',
        },
        accent: 'var(--accent)',
        success: {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
        blush: {
          DEFAULT: 'var(--pink)',
          soft: 'var(--pink-soft)',
        },
      },
      backgroundImage: {
        'brand-gradient': 'var(--brand-gradient)',
        'hero-gradient': 'var(--hero-gradient)',
      },
      boxShadow: {
        soft: 'var(--shadow)',
        strong: 'var(--shadow-strong)',
      },
      keyframes: { 'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } } },
      animation: { 'slide-up': 'slide-up 0.25s cubic-bezier(0.32,0,0.15,1)' },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}