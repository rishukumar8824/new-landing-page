/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        lime: {
          400: "#a8ff3e",
          500: "#8fe600",
        },
      },
      boxShadow: {
        card: "0 14px 40px rgba(15, 23, 42, 0.15)",
        lime: "0 0 20px rgba(168,255,62,0.25)",
      }
    }
  },
  plugins: []
};
