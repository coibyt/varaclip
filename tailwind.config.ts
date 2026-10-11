import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0B0B0F", 2: "#14141B", 3: "#1D1D27", 4: "#2A2A37" },
        glow: { DEFAULT: "#FF4D8D", dark: "#E02F70", soft: "#FF8DB5" },
        gold: "#F5C26B",
        mist: "#A6A6B8",
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      keyframes: {
        pop: { "0%": { transform: "scale(.4)", opacity: "0" }, "40%": { transform: "scale(1.25)", opacity: "1" }, "100%": { transform: "scale(1)", opacity: "0" } },
        up: { from: { transform: "translateY(12px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
      animation: { pop: "pop .8s ease-out forwards", up: ".35s ease-out both", shimmer: "shimmer 1.6s linear infinite" },
    },
  },
  plugins: [],
} satisfies Config;
