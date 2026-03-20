import { expect, test } from "@playwright/test";
import fs from "fs";
import { JSDOM } from "jsdom";
import path from "path";

const distDir = "dist";

const responseCache = new Map();

function getAllHtmlFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return getAllHtmlFiles(fullPath);
    }
    if (entry.isFile() && fullPath.endsWith(".html")) {
      return [fullPath];
    }
    return [];
  });
}

function getUrls(file) {
  const relativePath = file
    .replace(distDir, "")
    .replace(/index\.html$/, "")
    .replace(/\.html$/, "");
  const urlPath = relativePath === "" ? "/" : `${relativePath}`;
  return { urlPath, url: urlPath };
}

const htmlFiles = getAllHtmlFiles(distDir);

test.describe("smoke: built pages and internal links", () => {
  htmlFiles.forEach((file) => {
    const { urlPath, url } = getUrls(file);

    test(`page ${urlPath} should load without errors`, async ({ page }) => {
      const response = await page.goto(url);
      const status = response?.status() ?? 500;
      responseCache.set(url, status);

      expect(status).toBeLessThan(400);
    });
  });

  htmlFiles.forEach((file) => {
    const { urlPath, url } = getUrls(file);

    test(`internal links on ${urlPath}`, async ({ request, baseURL }) => {
      const htmlContent = fs.readFileSync(file, "utf-8");
      const dom = new JSDOM(htmlContent);
      const anchors = Array.from(dom.window.document.querySelectorAll("a"))
        .map((anchor) => anchor.getAttribute("href"))
        .filter((href) => href && href.startsWith("/"));

      for (const href of anchors) {
        const targetUrl = new URL(href, baseURL).toString();
        let status;

        if (responseCache.has(href)) {
          status = responseCache.get(href);
        } else {
          const response = await request.get(targetUrl);
          status = response.status();
          responseCache.set(href, status);
        }

        expect(status, `Broken link: ${href} on page ${url}`).toBeLessThan(400);
      }
    });
  });
});
