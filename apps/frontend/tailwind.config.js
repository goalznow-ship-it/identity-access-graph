/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        card: 'var(--color-card)',
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          muted: 'var(--color-primary-muted)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          muted: 'var(--color-secondary-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          hover: 'var(--color-danger-hover)',
          muted: 'var(--color-danger-muted)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          muted: 'var(--color-info-muted)',
        },
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.3)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      backdropBlur: {
        glass: '16px',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      width: {
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
      },
      spacing: {
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
        'navbar': '56px',
      },
    },
  },
  plugins: [],
}
