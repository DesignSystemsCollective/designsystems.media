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

  // Percentile-tiered word cloud (ADR 0013 rework), via the deterministic
  // fixture route rather than live /topics/ - pill sizes are computed
  // from percentiles over the live count distribution, so testing the
  // real page would mean re-capturing this baseline on almost every
  // content batch. Fixed counts here hit every size tier (xs/sm/md/lg/xl)
  // deterministically - see topic-cloud-fixture.astro.
  test("topic cloud fixture", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.topicCloudFixture);

    await expect(page).toHaveScreenshot("topic-cloud-fixture.png", {
      fullPage: true,
    });
  });

  // Curated card grid (ADR 0013) - structurally distinct from the A-Z
  // list layout /tools/, /systems/ and /tags/ share.
  test("series index page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.seriesIndex);

    await expect(page).toHaveScreenshot("series-index.png", {
      fullPage: true,
      mask: await maskAllResponsiveContainers(page),
    });
  });

  // Stands in for /tools/ and /systems/ too - all three render the same
  // alphabet-grouped LabelCount template, just with different data.
  test("tags index page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.tagsIndex);

    await expect(page).toHaveScreenshot("tags-index.png", {
      fullPage: false,
      mask: await maskAllResponsiveContainers(page),
    });
  });

  // Covers the shared taxonomy detail template used by series/topics/
  // tools/systems ([...slug].astro in each dir - identical body markup).
  test("topics detail page", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.topicsDetail);

    await expect(page).toHaveScreenshot("topics-detail.png", {
      fullPage: false,
      mask: await maskAllResponsiveContainers(page),
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

  // Real coverage for the homepage's "Popular topics/series/tools" row,
  // masked on the home page test since it's ranked by live entry counts -
  // see popular-facets-fixture.astro.
  test("popular facets fixture", async ({ page }) => {
    await prepareVisualPage(page, VISUAL_ROUTES.popularFacetsFixture);

    await expect(page).toHaveScreenshot("popular-facets-fixture.png", {
      fullPage: true,
    });
  });
});
