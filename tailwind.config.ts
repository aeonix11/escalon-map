import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class", // kept for optional future toggle
  theme: {
    extend: {
      colors: {
        prophetic: {
          DEFAULT: "#f59e0b",
          muted: "#f59e0b40",
        },
        earthly: {
          DEFAULT: "#0ea5e9",
          muted: "#0ea5e940",
        },
      },
    },
  },
  plugins: [],
};

export default config;
