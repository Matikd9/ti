import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "brand-primary": "#2563EB",
        "brand-secondary": "#0EA5E9"
      }
    }
  },
  plugins: []
};

export default config;
