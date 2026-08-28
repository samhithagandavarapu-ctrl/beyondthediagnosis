/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F3",
        ink: "#1C2B33",
        slate: {
          DEFAULT: "#33454E",
          light: "#5B6E77",
        },
        gold: {
          DEFAULT: "#B8912B",
          light: "#D9B85C",
          dark: "#8C6D1F",
        },
        sage: {
          DEFAULT: "#6E8B7C",
          light: "#9AB3A5",
          dark: "#4E6B5C",
        },
        clay: "#B4573E",
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        body: ["'Public Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};
