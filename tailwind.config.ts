import type { Config } from "tailwindcss";
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { bg: v("bg"), surface: v("surface"), ink: v("ink"), muted: v("muted"), line: v("line"), brand: v("brand"), "brand-ink": v("brand-ink"), live: v("live"), danger: v("danger") },
      fontFamily: { display: ["var(--font-display)", "system-ui", "sans-serif"], sans: ["var(--font-body)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
