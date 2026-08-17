import type { Config } from "tailwindcss";

// Mobile-first par défaut (breakpoints Tailwind = min-width) : on conçoit
// pour l'écran le plus étroit d'abord, et on élargit avec sm:/md:/lg:.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1E2E",
        accent: "#35418C",
        gold: "#A9782C",
      },
    },
  },
  plugins: [],
};

export default config;
