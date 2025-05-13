import { expect, test } from "@playwright/test";
import fs from "fs";
import { JSDOM } from "jsdom";
import path from "path";

const baseUrl = "http://localhost:4321";
const distDir = "dist";

// Shared request cache to avoid re-fetching the same links
const responseCache = new Map();

function getAllHtmlFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) return getAllHtmlFiles(fullPath);
    if (entry.isFile() && fullPath.endsWith(".html")) return [fullPath];
    return [];
  });
}

function getUrls(file) {
  const relativePath = file
    .replace(distDir, "")
    .replace(/index\.html$/, "")
    .replace(/\.html$/, "");
  const urlPath = relativePath === "" ? "/" : `${relativePath}`;
  const url = `${baseUrl}${urlPath}`;
  return { urlPath, url };
}

const htmlFiles = getAllHtmlFiles(distDir);

test.describe("Check all site pages and links", () => {
  // Run page load tests first to preload the responseCache
  htmlFiles.forEach((file) => {
    const { urlPath, url } = getUrls(file);

    test(`Page ${urlPath} should load without errors`, async ({ page }) => {
      const response = await page.goto(url);
      const status = response.status();
      responseCache.set(url, status);

      expect(status).toBeLessThan(400);
    });
  });

  // Run internal link tests after page load tests to preload the responseCache
  htmlFiles.forEach((file) => {
    const { urlPath, url } = getUrls(file);

    test(`Check internal links on ${urlPath}`, async ({ request }) => {
      const htmlContent = fs.readFileSync(file, "utf-8");
      const dom = new JSDOM(htmlContent);
      const anchors = Array.from(dom.window.document.querySelectorAll("a"))
        .map((a) => a.getAttribute("href"))
        .filter((href) => !!href && href.startsWith("/"));

      for (const href of anchors) {
        const targetUrl = `${baseUrl}${href}`;

        let status;
        if (responseCache.has(targetUrl)) {
          status = responseCache.get(targetUrl);
        } else {
          const response = await request.get(targetUrl);
          status = response.status();
          responseCache.set(targetUrl, status);
        }

        expect(status, `Broken link: ${href} on page ${url}`).toBeLessThan(400);
      }
    });
  });
});
