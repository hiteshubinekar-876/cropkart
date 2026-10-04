import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2fbf3",
          100: "#d7f4da",
          200: "#afe8b6",
          300: "#7dd78a",
          400: "#4fc15f",
          500: "#2fa143",
          600: "#217f34",
          700: "#1d652d",
          800: "#1a5027",
          900: "#174322",
        },
        ink: {
          50: "#f6f7fb",
          100: "#edeff6",
          200: "#d6dbe9",
          300: "#b1bdd6",
          400: "#8795b7",
          500: "#68779d",
          600: "#51607f",
          700: "#424d66",
          800: "#384054",
          900: "#252b39",
        },
        wheat: "#f9f1d6",
        clay: "#f28b52",
        ocean: "#eaf5ff",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        soft: "0 20px 50px -24px rgba(15, 23, 42, 0.18)",
        card: "0 14px 38px -24px rgba(15, 23, 42, 0.2)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
