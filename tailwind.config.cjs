/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        pip: ['Share Tech Mono', 'monospace'],
      },
      colors: {
        'forge-dark': '#0f172a',
        'forge-panel': '#1e293b',
        'forge-accent': '#38bdf8',
        'terminal-green': '#22c55e',
        'pip-green': '#16f342',
        'pip-dim': '#0d3d15',
      },
    },
  },
  plugins: [],
};
