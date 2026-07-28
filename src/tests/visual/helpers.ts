import { expect, type Locator, type Page } from "@playwright/test";

export async function prepareVisualPage(page: Page, route: string) {
  // No search-dropdown guard needed here (there used to be one - see git
  // history / PR #96 discussion): search moved from <pagefind-searchbox>,
  // a CSS-only dropdown that could in principle be left open by a stray
  // focus state, to <pagefind-modal-trigger> + a native <dialog>. A
  // dialog only renders once something explicitly calls .showModal() -
  // prepareVisualPage never does, so it's inert on every route here by
  // construction, not by a display:none hack that has to be kept in sync
  // with whatever class name the library happens to use this version.
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
    `,
  });
  await waitForVisibleImages(page);
}

// The search box lives inside Header.astro's collapsible mobile menu
// (hidden by default under 768px, see Header.astro's .nav-menu CSS) - on
// the visual-mobile project it has to be opened via the hamburger button
// before the search input is visible/interactable at all. On
// visual-desktop the button itself is hidden (display:none), so this is
// a no-op there rather than needing two separate code paths per project.
export async function openMobileMenuIfNeeded(page: Page) {
  const menuButton = page.locator(".nav-menu-button");
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
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
