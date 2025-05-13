import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";

const baseUrl = "http://localhost:4321"; // Or wherever your dev server runs

// Helper to recursively find .html files in `dist` (if testing static site)
function getAllHtmlFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllHtmlFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith(".html")) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

test.describe("Check all site pages and links", () => {
  const distDir = "dist"; // Use `.astro` config output directory
  const htmlFiles = getAllHtmlFiles(distDir);

  htmlFiles.forEach((file) => {
    const relativePath = file
      .replace(distDir, "")
      .replace(/index\.html$/, "")
      .replace(/\.html$/, "");

    const urlPath = relativePath === "" ? "/" : `${relativePath}`;
    const url = `${baseUrl}${urlPath}`;

    test(`Page ${urlPath} should load without errors`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status()).toBeLessThan(400);
    });
  });
});
