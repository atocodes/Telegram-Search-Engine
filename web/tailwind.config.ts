import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#05070a",
        surface: "#0b0f14",
        "surface-2": "#11161d",

        border: "#1a212c",
        "border-bright": "#2a3442",

        fg: "#eef2f7",
        "fg-bright": "#ffffff",
        muted: "#7d8898",

        // Underground Brand Colors
        accent: "#2296ff", // telegram blue
        "accent-dim": "#123a63",
        underground: "#0d1117",

        success: "#3ddc97",
        warn: "#f5a623",
        danger: "#ff5c5c",
        info: "#5ac8fa",
      },

      fontFamily: {
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],

        sans: [
          "var(--font-sans)",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },

      boxShadow: {
        glow: "0 0 0 1px rgba(34,150,255,0.25), 0 0 28px -8px rgba(34,150,255,0.35)",
        soft: "0 8px 32px rgba(0,0,0,0.35)",
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },

      keyframes: {
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },

        "fade-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(8px)",
          },

          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        float: {
          "0%,100%": {
            transform: "translateY(0px)",
          },

          "50%": {
            transform: "translateY(-4px)",
          },
        },

        glow: {
          "0%,100%": {
            boxShadow:
              "0 0 0 1px rgba(34,150,255,0.2), 0 0 18px rgba(34,150,255,0.18)",
          },

          "50%": {
            boxShadow:
              "0 0 0 1px rgba(34,150,255,0.4), 0 0 28px rgba(34,150,255,0.32)",
          },
        },
      },

      animation: {
        blink: "blink 1.1s step-end infinite",
        "fade-up": "fade-up 0.4s ease-out both",
        float: "float 4s ease-in-out infinite",
        glow: "glow 3s ease-in-out infinite",
      },

      backgroundImage: {
        grid: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
      },

      backgroundSize: {
        grid: "32px 32px",
      },
    },
  },

  plugins: [],
};

export default config;