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

  // Guards against a regression where multiple two-word speaker names
  // wrapped mid-name on narrow viewports, with the comma stranded on the
  // wrong line (MetaItem.astro's .speakers-container needed
  // flex-wrap + white-space: nowrap on the links).
  test("video detail page with multiple multi-word speakers", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.videoDetailMultiSpeaker);

    await expect(page).toHaveScreenshot("video-detail-multi-speaker.png", {
      fullPage: true,
    });
  });

  // Guards against a regression where whitespace inside the <a> in
  // Hero.astro's speaker list rendered as a literal space before the
  // comma ("Davy Fung , PJ Onori").
  test("show detail page with multi-word speakers", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.showDetailMultiSpeaker);

    await expect(page).toHaveScreenshot("show-detail-multi-speaker.png", {
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

  // Phase 6a: deterministic card fixtures (VideoCard/PodcastCard/ShowCard
  // in both grid and list layout, hard-coded props - no live-content
  // dependency). Deliberately unmasked, unlike the grid sections on
  // routes above - see docs/adr/0007-visual-fixture-route.md for why the
  // existing suite couldn't already cover this.
  test("card visual fixtures", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.cardFixtures);

    await expect(page).toHaveScreenshot("card-fixtures.png", {
      fullPage: true,
    });
  });
});
