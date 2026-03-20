import { expect, type Locator, type Page } from "@playwright/test";

export async function prepareVisualPage(page: Page, route: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("header")).toBeVisible();
  await page.evaluate(async () => {
    if ("fonts" in document) {
      await document.fonts.ready;
    }
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      .pagefind-ui__drawer {
        display: none !important;
      }
    `,
  });
  await waitForVisibleImages(page);
}

export async function maskHomeDynamicRegions(page: Page): Promise<Locator[]> {
  return [
    page.locator(".libraryStats [data-type='count']"),
    page.locator(".responsive-container").nth(0),
    page.locator(".responsive-container").nth(1),
  ];
}

export async function maskAllResponsiveContainers(page: Page): Promise<Locator[]> {
  return page.locator(".responsive-container").all();
}

async function waitForVisibleImages(page: Page) {
  await page.evaluate(async () => {
    const visibleImages = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom >= 0 && rect.top <= window.innerHeight * 1.5;
    });

    await Promise.all(
      visibleImages.map(async (image) => {
        if (image.complete) {
          return;
        }

        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }),
    );
  });
}
