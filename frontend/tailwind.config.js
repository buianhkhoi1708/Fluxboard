/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mac-sidebar': '#f9f9f9',
        'mac-border': '#e0e0e0',
      },
    },
  },
  plugins: [],
}