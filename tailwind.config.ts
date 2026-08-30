import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#F2F4EF",
        surface: "#FFFFFF",
        ink: "#14181A",
        mist: "#5B635F",
        border: "#DEDDD3",
        accent: "#2452E8",
        signal: "#A8FF3E",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
