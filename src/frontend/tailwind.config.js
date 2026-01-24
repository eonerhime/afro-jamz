/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF4ED',
          100: '#FFE6D5',
          200: '#FFC9AA',
          300: '#FFA574',
          400: '#FF7A3C',
          500: '#FF6B35',
          600: '#F04E16',
          700: '#C73B0D',
          800: '#9E3113',
          900: '#7F2D13',
        },
        secondary: {
          50: '#FEF9E7',
          100: '#FEF3C3',
          200: '#FDE58A',
          300: '#FCD448',
          400: '#FAC515',
          500: '#F7931E',
          600: '#D86F08',
          700: '#B54F0B',
          800: '#923D10',
          900: '#783311',
        },
        accent: {
          50: '#EDFAFA',
          100: '#D5F5F5',
          200: '#AFEBEB',
          300: '#7CDCDC',
          400: '#48C5C5',
          500: '#2EC4B6',
          600: '#229F93',
          700: '#207D75',
          800: '#20635E',
          900: '#1F524E',
        },
      },
    },
  },
  plugins: [],
}
