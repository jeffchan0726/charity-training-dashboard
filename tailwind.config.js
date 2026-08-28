/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/*.js",
    "./css/mobile-app.css"
  ],
  safelist: [
    "hidden",
    "flex",
    "ring-2",
    "ring-emerald-400",
    "bg-emerald-700",
    "bg-sky-800",
    "bg-[#166534]",
    "bg-[#292524]",
    "text-white",
    "text-red-400",
    "text-sky-300",
    "text-[#a8a29e]",
    "bg-emerald-800/60"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}