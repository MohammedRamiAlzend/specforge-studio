/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          50: "#fdf8f0",
          100: "#f9ecda",
          200: "#f2d6b0",
          300: "#eab97d",
          400: "#e19c4d",
          500: "#d97f2b",
          600: "#c96a22",
          700: "#a7521e",
          800: "#864320",
          900: "#6d391d",
          950: "#3a1c0d",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 3px 0 rgb(15 23 42 / 0.08)",
      },
    },
  },
  plugins: [],
};
