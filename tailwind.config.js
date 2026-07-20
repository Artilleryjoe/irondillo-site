/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      colors: {
        armadilloBlack: "#16202a",
        armadilloGray: "#52606d",
        oliveGreen: "#1768ac",
        oliveDark: "#123f68",
        offWhite: "#f8fafb"
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"]
      }
    }
  }
};
