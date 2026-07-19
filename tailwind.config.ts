import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff", 100: "#dbe6ff", 500: "#3b5bdb", 600: "#3049b3", 700: "#26398c",
        },
      },
    },
  },
  plugins: [],
};
export default config;
