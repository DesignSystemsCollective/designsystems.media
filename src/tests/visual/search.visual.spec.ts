import { expect, test } from "@playwright/test";
import { openMobileMenuIfNeeded, prepareVisualPage } from "./helpers";
import { VISUAL_ROUTES } from "./routes";

// Regression coverage for search, covering two separate fixes:
//
// 1. (originally PR #96) Header.astro's search theming tokens
//    (tokens/semantic.css's --pagefind-ui-* set) were written for the
//    classic pagefind-ui widget - astro-pagefind v2 renders
//    @pagefind/component-ui elements instead, which read a different
//    set of custom properties (--pf-*) that those tokens never reached.
//    Search silently fell back to the component's generic default look
//    with nothing in the build to catch it. tokens/semantic.css's --pf-*
//    block fixed the theming.
// 2. Search was then moved from <pagefind-searchbox> (a compact inline
//    dropdown with no image support in its default template at all - no
//    config option, the markup just has no <img>) to a
//    <pagefind-modal-trigger> + <pagefind-modal> composition using
//    <pagefind-results show-images>, which does support thumbnails.
//
// These tests exist so a future dependency bump, token rename, or
// reversion to the searchbox pattern can't regress either fix without a
// screenshot failing.
test.describe("search visual regression coverage", () => {
  test("search trigger - idle state", async ({ page }) => {
    // Reuses the deterministic /dev/visual-fixtures/ route (see
    // docs/adr/0007-visual-fixture-route.md) purely because the header -
    // and therefore the search trigger - renders identically on every
    // page. That decouples this test from any specific route's content.
    await prepareVisualPage(page, VISUAL_ROUTES.cardFixtures);
    await openMobileMenuIfNeeded(page);

    await expect(page.locator("header")).toHaveScreenshot(
      "search-trigger-idle.png",
    );
  });

  test("search modal - open with results loading", async ({ page }) => {
    // Stall only the per-result fragment files (dist/pagefind/fragment/
    // *.pf_fragment - the title/excerpt/image payload for each matched
    // page), not the whole **/pagefind/** tree. Pagefind's search flow
    // is two-stage: instance.search(term) resolves quickly against the
    // already-loaded index and fires a "results" event with lightweight
    // result refs - that's what makes pagefind-results append the
    // per-result placeholder markup (including the image skeleton, only
    // present because show-images is on) in the first place. Each
    // result's actual data - title, excerpt, image - is then fetched
    // lazily from its own fragment file and swaps the placeholder out.
    // Stalling the whole tree blocks the index/wasm bootstrap itself, so
    // the component never gets past its initial "loading" state at all
    // (which renders nothing - no skeleton, nothing to screenshot) and
    // never reaches "results". Stalling just the fragment files lets the
    // index load and the results event fire normally, then freezes each
    // result exactly where this test wants it: skeleton rendered, data
    // never arriving. A resolved query's *results* are live content
    // (titles/counts/thumbnails drift as new videos and podcasts get
    // published - the exact problem docs/adr/0007 already solved for
    // cards), but the loading chrome this test is actually guarding -
    // modal background/border/radius/shadow, the skeleton rows, the
    // keyboard-hint footer - is static markup regardless of query.
    // Freezing here gives full coverage of both fixes above with zero
    // content-drift risk. The route has to be registered before
    // navigation: the component can start fetching its index as soon as
    // the page loads, not only on the first keystroke.
    await page.route("**/pagefind/fragment/**", () => new Promise(() => {}));

    await prepareVisualPage(page, VISUAL_ROUTES.cardFixtures);
    await openMobileMenuIfNeeded(page);

    await page.locator(".pf-trigger-btn").click();
    const modal = page.locator("dialog.pf-modal");
    await expect(modal).toBeVisible();

    await modal.locator(".pf-input").fill("design");

    // Confirms both the loading state and that show-images actually
    // took effect - the image skeleton only exists in the placeholder
    // markup pagefind-results renders for image-enabled results.
    await expect(modal.locator(".pf-skeleton-image").first()).toBeVisible();

    // An element screenshot of the dialog itself (rather than a
    // viewport/fullPage shot) deliberately excludes the ::backdrop - it
    // isn't part of the dialog's own render box - so there's nothing
    // behind it that needs masking against content drift.
    await expect(modal).toHaveScreenshot("search-modal-loading.png");
  });
});
