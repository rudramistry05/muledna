/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        boi: {
          saffron: "#FF9933",
          navy: "#0A2647",
          blue: "#144272",
          lightBlue: "#205295",
        },
        navy: {
          950: "#040D12",
          900: "#0B192C",
          800: "#1E3E62",
          700: "#2C5E8A",
          600: "#3E7CA7"
        },
        glass: {
          card: "rgba(30, 62, 98, 0.4)",
          border: "rgba(255, 255, 255, 0.08)",
          glow: "rgba(255, 153, 51, 0.15)"
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace']
      },
      boxShadow: {
        'glass-glow': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon-red': '0 0 15px rgba(239, 68, 68, 0.5)',
        'neon-saffron': '0 0 15px rgba(255, 153, 51, 0.5)',
        'neon-emerald': '0 0 15px rgba(16, 185, 129, 0.5)'
      }
    },
  },
  plugins: [],
}
