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
        ink: "#292621",
        pearl: "#fbf8f2",
        linen: "#f2eadf",
        mist: "#e8e5de",
        gold: "#b59662",
        taupe: "#776b5f",
        cocoa: "#51473f",
      },
      boxShadow: {
        soft: "0 24px 80px rgba(59, 49, 38, 0.12)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
