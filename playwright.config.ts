import { defineConfig } from "@playwright/test";

const PORT = 4321;

export default defineConfig({
  testDir: "./src/tests",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
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
        // Attach a full-page screenshot to every test regardless of
        // pass/fail (unlike toHaveScreenshot's own attachments, which
        // only appear on failure) - so the HTML report has something to
        // show even on an all-green run. Scoped to the visual projects
        // only: applying this to smoke's ~5,700 checks would bloat the
        // report for no benefit there.
        screenshot: "on",
      },
    },
    {
      name: "visual-mobile",
      testMatch: /.*\.visual\.spec\.(js|ts)$/,
      use: {
        viewport: { width: 393, height: 852 },
        screenshot: "on",
      },
    },
  ],
});
