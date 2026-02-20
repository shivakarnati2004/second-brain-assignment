/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#050508',
          900: '#0a0a12',
          800: '#111120',
          700: '#1a1a2e',
          600: '#22223b',
        },
        ember: {
          400: '#ff6b35',
          500: '#e85d27',
          600: '#c4421a',
        },
        aurora: {
          400: '#7ee8fa',
          500: '#4ecdc4',
          600: '#2ab8ae',
        },
        neural: {
          400: '#c77dff',
          500: '#9d4edd',
          600: '#7b2fbe',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'drift': 'drift 20s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '25%': { transform: 'translate(20px, -30px) rotate(5deg)' },
          '50%': { transform: 'translate(-10px, 20px) rotate(-3deg)' },
          '75%': { transform: 'translate(-25px, -10px) rotate(7deg)' },
        },
      },
    },
  },
  plugins: [],
}
