import type { Config } from "tailwindcss";
import flowbitePlugin from "flowbite/plugin";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "node_modules/flowbite-react/lib/**/*.{js,ts,jsx,tsx}",
    "node_modules/flowbite/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "DM Sans", "system-ui", "sans-serif"],
      },
      colors: {
        brand: { DEFAULT: "#0EA5A4", dark: "#0B7A79" },
        tile: {
          blue: "#E0F2FE",
          mint: "#DCFCE7",
          lavender: "#EDE9FE",
          peach: "#FFE4D6",
        },
      },
    },
  },
  plugins: [flowbitePlugin],
};

export default config;
