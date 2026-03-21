/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./theme/**/*.{js,ts,jsx,tsx}",
    "./zh/**/*.md",
    "./en/**/*.md",
    "./*.md",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: "class",
};
