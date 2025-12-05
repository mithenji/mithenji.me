// Shared Tailwind CSS preset for Phoenix main app and livebooks
// This file contains common theme configurations, daisyUI settings, and plugins

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "GeistSans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Roboto",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
        mono: [
          "GeistMono",
          "ui-monospace",
          "SFMono-Regular",
          "Roboto Mono",
          "Menlo",
          "Monaco",
          "Liberation Mono",
          "DejaVu Sans Mono",
          "Courier New",
          "monospace",
        ]
      },
    },
  },
  daisyui: {
    themes: [
      {
        night: {
          ...require("daisyui/src/theming/themes")["night"],
          "base-content": "#e4e4e7",
        },
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          "base-content": "#e4e4e7",
          primary: "#f97316",
        },
      },
      "dracula",
      "sunset"
    ],
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui"),
  ],
};

