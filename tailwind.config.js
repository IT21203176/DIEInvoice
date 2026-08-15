/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Times New Roman"', "Times", "serif"],
        sans: ['"Segoe UI"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#111111",
        paper: "#f7f4ee",
        navy: "#1c2b4a",
        gold: "#c4a35a",
      },
    },
  },
  plugins: [],
};
