/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      colors: {
        armadilloBlack: "#16202a",
        armadilloGray: "#52606d",
        oliveGreen: "#62b6f0",
        oliveDark: "#123f68",
        offWhite: "#f8fafb"
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"]
      }
    }
  }
};
