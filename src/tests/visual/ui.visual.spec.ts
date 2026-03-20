import { expect, test } from "@playwright/test";
import {
  maskAllResponsiveContainers,
  maskHomeDynamicRegions,
  prepareVisualPage,
} from "./helpers";
import { VISUAL_ROUTES } from "./routes";

test.describe("visual regression coverage", () => {
  test("home page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.home);

    await expect(page).toHaveScreenshot("home.png", {
      fullPage: true,
      mask: await maskHomeDynamicRegions(page),
    });
  });

  test("all videos page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.all);

    await expect(page).toHaveScreenshot("all-videos.png", {
      fullPage: false,
      mask: [page.locator(".responsive-container")],
    });
  });

  test("podcast index page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.podcastIndex);

    await expect(page).toHaveScreenshot("podcast-index.png", {
      fullPage: false,
      mask: await maskAllResponsiveContainers(page),
    });
  });

  test("video detail page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.videoDetail);

    await expect(page).toHaveScreenshot("video-detail.png", {
      fullPage: true,
    });
  });

  test("podcast detail page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.podcastDetail);

    await expect(page).toHaveScreenshot("podcast-detail.png", {
      fullPage: true,
    });
  });

  test("show detail page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.showDetail);

    await expect(page).toHaveScreenshot("show-detail.png", {
      fullPage: false,
      mask: [page.locator(".responsive-container")],
    });
  });

  test("tag detail page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.tagDetail);

    await expect(page).toHaveScreenshot("tag-detail.png", {
      fullPage: false,
    });
  });

  test("speaker detail page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.speakerDetail);

    await expect(page).toHaveScreenshot("speaker-detail.png", {
      fullPage: true,
    });
  });

  test("playlist detail page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.playlistDetail);

    await expect(page).toHaveScreenshot("playlist-detail.png", {
      fullPage: true,
    });
  });
});
