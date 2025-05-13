import { expect, test } from "@playwright/test";
import fs from "fs";
import { JSDOM } from "jsdom";
import path from "path";

const baseUrl = "http://localhost:4321";
const distDir = "dist";

// Recursively find all HTML files in the dist folder
function getAllHtmlFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) return getAllHtmlFiles(fullPath);
    if (entry.isFile() && fullPath.endsWith(".html")) return [fullPath];
    return [];
  });
}

const htmlFiles = getAllHtmlFiles(distDir);

// Shared request cache to avoid re-fetching the same links
const responseCache = new Map();

test.describe("Internal link validation", () => {
  for (const file of htmlFiles) {
    const relativePath = file
      .replace(distDir, "")
      .replace(/index\.html$/, "")
      .replace(/\.html$/, "");

    const urlPath = relativePath === "" ? "/" : `${relativePath}`;
    const pageUrl = `${baseUrl}${urlPath}`;

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

        expect(status, `Broken link: ${href} on page ${pageUrl}`).toBeLessThan(
          400
        );
      }
    });
  }
});
