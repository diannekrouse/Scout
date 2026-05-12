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
        // Warm cream + paper palette (light theme).
        cream: "#FCF8F3",       // page background base
        cream2: "#FFF3E5",      // soft accent wash
        paper: "#FFFFFF",       // card surface
        line: "#F0EAE0",        // dividers / subtle borders
        line2: "#E5DDD0",       // slightly stronger border
        dim: "#A89A88",          // tertiary text
        muted: "#7A6F60",        // secondary text
        body: "#3A2E20",         // body text (warm near-black)
        bright: "#1A1410",       // headings (deep warm)
        // Friendly accent palette — keeps the dossier's gold but adds
        // softer pastels for cute vibe.
        gold: "#F4C770",
        peach: "#FFB39A",
        mint: "#7DD3A0",
        sky: "#9BC9E8",
        lilac: "#C8B5D9",
        // Backwards-compat aliases (so any lingering references still resolve)
        ink: "#FCF8F3",
        ink2: "#FFFFFF",
        accent: "#FFB39A",
      },
      fontFamily: {
        // Friendly modern sans for headings — replaces the serif.
        display: [
          "Plus Jakarta Sans",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        // Keep Cormorant available for the rare moment we want a literary touch.
        serif: [
          "Fraunces",
          "Cormorant Garamond",
          "Iowan Old Style",
          "Times New Roman",
          "serif",
        ],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        // Soft, generous card shadow for the friendly feel.
        soft: "0 4px 24px -8px rgba(58, 46, 32, 0.08), 0 2px 6px -2px rgba(58, 46, 32, 0.04)",
        softer: "0 2px 12px -4px rgba(58, 46, 32, 0.06)",
        lift: "0 12px 32px -12px rgba(58, 46, 32, 0.12), 0 4px 10px -4px rgba(58, 46, 32, 0.06)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
