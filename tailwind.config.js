/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./constants/**/*.{ts,tsx}",
    "./firebase/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        chef: {
          black: "#0E1111",
          charcoal: "#171A1F",
          panel: "#202329",
          line: "#32363D",
          cream: "#FFF4E0",
          muted: "#A8A29A",
          saffron: "#F6A033",
          herb: "#3DDC97",
          tomato: "#F45D48",
          plum: "#9B5DE5"
        }
      },
      borderRadius: {
        chef: "18px"
      },
      fontSize: {
        "chef-xs": ["13px", "18px"],
        "chef-sm": ["15px", "22px"],
        "chef-base": ["17px", "25px"],
        "chef-lg": ["20px", "28px"],
        "chef-xl": ["26px", "34px"],
        "chef-2xl": ["34px", "42px"]
      }
    }
  },
  plugins: []
};
