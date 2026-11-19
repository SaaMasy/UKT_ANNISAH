/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        bryx: {
          blue: "#83D5F5",
          pink: "#F72578",
          cream: "#F7F3E9",
          ink: "#101010"
        }
      }
    }
  },
  plugins: []
};
