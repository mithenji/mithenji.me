// Tailwind CSS configuration for this livebook
const path = require("path");
const sharedPreset = require("../../shared/tailwind.preset.js");

module.exports = {
  presets: [sharedPreset],
  content: [
    path.join(__dirname, "./index.html"),
    path.join(__dirname, "./*.js"),
  ],
};

