/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      colors: {
        armadilloBlack: "#16202a",
        armadilloGray: "#52606d",
        oliveGreen: "#395d44",
        oliveDark: "#214131",
        offWhite: "#f8fafb"
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"]
      }
    }
  }
};
