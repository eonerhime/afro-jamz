/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fef5ee",
          100: "#fde8d6",
          200: "#fbcdad",
          300: "#f8a979",
          400: "#f47d43",
          500: "#f15f1f",
          600: "#e24515",
          700: "#bb3314",
          800: "#952a18",
          900: "#792517",
        },
        secondary: {
          50: "#fdf4f3",
          100: "#fce7e4",
          200: "#fad3cd",
          300: "#f5b3aa",
          400: "#ed8478",
          500: "#e15c4e",
          600: "#cd4132",
          700: "#ab3427",
          800: "#8e2e24",
          900: "#762a24",
        },
        accent: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
        },
      },
    },
  },
  plugins: [],
};
