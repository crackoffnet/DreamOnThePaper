import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1e1a16",
        pearl: "#f5f0e8",
        linen: "#f5f0e8",
        mist: "#e8dfd1",
        gold: "#b8902a",
        taupe: "#7a6a58",
        cocoa: "#6b5a3e",
      },
      boxShadow: {
        soft: "0 18px 55px rgba(54, 43, 31, 0.09)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "DM Sans", "system-ui", "sans-serif"],
        display: [
          "var(--font-display)",
          "Cormorant Garamond",
          "Georgia",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
