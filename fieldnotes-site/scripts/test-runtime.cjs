const path = require("node:path");
const fs = require("node:fs");
const directory = path.resolve(__dirname, "../artifacts");
fs.mkdirSync(directory, { recursive: true });
module.exports = {
  chromium: require("playwright").chromium,
  launchOptions: {
    headless: true,
    ...(process.env.BROWSER_CHANNEL
      ? { channel: process.env.BROWSER_CHANNEL }
      : {}),
  },
  baseURL: process.env.BASE_URL || "http://127.0.0.1:4173/",
  artifact: (name) => path.join(directory, name),
  axePath: require.resolve("axe-core/axe.min.js"),
};
