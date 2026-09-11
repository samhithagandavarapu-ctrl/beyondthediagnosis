/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: "#213244",
        mist: "#F3F9FE",
        sky: {
          DEFAULT: "#8FCBF2",
          hover: "#7BC0EE",
          tint: "#E4F1FC",
          ink: "#16394F",
        },
        coral: {
          DEFAULT: "#FFA694",
          hover: "#FF8E77",
          ink: "#4A1F14",
        },
        butter: {
          DEFAULT: "#FFDE9E",
          ink: "#4A3A12",
        },
        body: "#3C5266",
        muted: "#4A6076",
        link: "#1B5C8F",
        // Legacy names, remapped onto the Verity palette so pages that still
        // use them (Login, AppointmentPrep, Profile, ...) follow the redesign.
        paper: "#F3F9FE",
        ink: "#213244",
        slate: {
          DEFAULT: "#3C5266",
          light: "#4A6076",
        },
        gold: {
          DEFAULT: "#1B5C8F",
          light: "#FFDE9E",
          dark: "#1B5C8F",
        },
        sage: {
          DEFAULT: "#8FCBF2",
          light: "#E4F1FC",
          dark: "#1B5C8F",
        },
        clay: "#4A1F14",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "'Public Sans'", "sans-serif"],
        body: ["'Public Sans'", "system-ui", "sans-serif"],
      },
      // rem so the "Large text" / "Easy read" root font-size scales everything.
      fontSize: {
        11: "0.6875rem",
        12: "0.75rem",
        13: "0.8125rem",
        15: "0.9375rem",
        17: "1.0625rem",
        21: "1.3125rem",
        23: "1.4375rem",
        26: "1.625rem",
        28: "1.75rem",
        30: "1.875rem",
      },
      opacity: {
        7: "0.07",
        12: "0.12",
        16: "0.16",
        65: "0.65",
        85: "0.85",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "14px",
        tile: "14px",
        card: "20px",
        panel: "24px",
      },
    },
  },
  plugins: [],
};
