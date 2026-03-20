import { defineConfig } from "@playwright/test";

const PORT = 4321;

export default defineConfig({
  testDir: "./src/tests",
  fullyParallel: true,
  reporter: "list",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      scale: "css",
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 4321 --directory dist",
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "smoke",
      testMatch: /.*\.smoke\.spec\.(js|ts)$/,
      use: {
        viewport: { width: 1440, height: 1200 },
      },
    },
    {
      name: "visual-desktop",
      testMatch: /.*\.visual\.spec\.(js|ts)$/,
      use: {
        viewport: { width: 1440, height: 1200 },
      },
    },
    {
      name: "visual-mobile",
      testMatch: /.*\.visual\.spec\.(js|ts)$/,
      use: {
        viewport: { width: 393, height: 852 },
      },
    },
  ],
});
