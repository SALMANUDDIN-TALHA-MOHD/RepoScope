/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0E14",
          soft: "#12151C",
          border: "#232733",
        },
        mist: {
          DEFAULT: "#E6E8EB",
          muted: "#8B93A7",
          faint: "#5A6272",
        },
        signal: {
          pass: "#5EEAD4",
          warn: "#FB923C",
          fail: "#F87171",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      maxWidth: {
        content: "1160px",
      },
    },
  },
  plugins: [],
};
