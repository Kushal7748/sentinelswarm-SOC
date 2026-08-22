/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Light palette tokens
        ivory: {
          50:  '#faf9f7',
          100: '#f5f3ef',
          200: '#eeecea',
          300: '#e2ddd8',
          400: '#c5beb5',
          500: '#a8a29e',
        },
        sentinel: {
          primary:  '#0e7490',
          mid:      '#0891b2',
          light:    '#22d3ee',
          pale:     '#cffafe',
          gold:     '#b45309',
          amber:    '#d97706',
          amber100: '#fef3c7',
          success:  '#047857',
          green100: '#d1fae5',
          danger:   '#be123c',
          red100:   '#ffe4e6',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Geist Mono', 'monospace'],
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.9s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'swap-glow':  'swapGlowLight 1.2s ease-in-out infinite',
        'voice-ring': 'voiceRing 1.4s ease-out infinite',
      },
      keyframes: {
        swapGlowLight: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(190,18,60,0)' },
          '50%':       { boxShadow: '0 0 10px rgba(190,18,60,0.25)' },
        },
        voiceRing: {
          '0%':   { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
