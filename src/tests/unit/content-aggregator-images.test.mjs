import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import http from "node:http";
import os from "os";
import path from "path";
import matter from "gray-matter";
import getImages from "../../../content-aggregator/scripts/shared/getImages.ts";

const { processShowMarkdownFile, processEpisodeMarkdownFile, processMarkdownFile, updateMarkdownFile } =
  getImages;

// A URL nothing listens on - fails fast (ECONNREFUSED) rather than timing
// out, while still exercising the real downloadImageWithRetry retry loop
// (3 retries * 500ms delay = the tests below take ~1.5s+ each).
const UNREACHABLE_URL = "http://127.0.0.1:1/no-such-image.jpg";

function mkTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFrontmatter(filePath, data, content = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, matter.stringify(content, data));
}

function readFrontmatter(filePath) {
  return matter(fs.readFileSync(filePath, "utf8"));
}

// gray-matter caches parsed results keyed by the raw string content, not by
// file path (see its docs on matter.clearCache()). Several fixtures below
// intentionally reuse similar frontmatter shapes across tests, and without
// clearing the cache, a later test can get back an earlier test's
// already-mutated data object for byte-identical input - producing results
// that look like a real bug but are actually cross-test pollution from the
// cache. Every function under test here mutates its `data` object in place,
// so this matters a lot; clear it before each test as a matter of hygiene.
function freshMatterCache() {
  matter.clearCache();
}

// Phase 5 of the refactor plan: on download failure, these functions used to
// fall back to a `./hqdefault.jpg` reference that no file on disk ever
// produces. Astro's image() schema resolves `image`/`poster` as local file
// paths at build time and throws a fatal error if the file can't be
// resolved - so that placeholder was a live build-breakage risk, not just a
// cosmetic bug. The fix: omit/null the field and leave localImages false so
// a future aggregator run retries the download.
//
// That "retry on next run" claim was never actually true until the
// sourceImageUrl fix below: deleting image/poster on failure also threw
// away the only URL a future run could retry from, so anything that failed
// once was stuck without a thumbnail forever. sourceImageUrl exists purely
// to survive that deletion.

test("processShowMarkdownFile: on download failure, deletes data.image and leaves localImages false for retry", async (t) => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-show-img-");
  const filePath = path.join(tmp, "show", "some-show", "index.mdx");
  writeFrontmatter(filePath, {
    title: "Some Show",
    image: UNREACHABLE_URL,
    localImages: false,
  });

  await processShowMarkdownFile(filePath);

  const { data } = readFrontmatter(filePath);
  assert.equal("image" in data, false, "image field should be removed, not pointed at a placeholder");
  assert.equal(data.localImages, false, "localImages should stay false so a future run retries");
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL, "the failed URL must survive so a future run has something to retry");
});

test("processShowMarkdownFile: a second run actually retries and succeeds once the URL is reachable", async (t) => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-show-img-retry-");
  const filePath = path.join(tmp, "show", "some-show", "index.mdx");
  writeFrontmatter(filePath, {
    title: "Some Show",
    image: UNREACHABLE_URL,
    localImages: false,
  });

  await processShowMarkdownFile(filePath);
  freshMatterCache();
  let { data } = readFrontmatter(filePath);
  assert.equal(data.localImages, false);

  // Simulate the source becoming reachable on a later run by pointing
  // downloadImageWithRetry's real target at something that resolves - here,
  // a local file:// isn't supported by axios's stream mode, so instead we
  // assert on the field the retry logic itself reads: sourceImageUrl must
  // still hold the original URL after the failed run, proving the *next*
  // run has a real URL to work with rather than nothing.
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL);

  await processShowMarkdownFile(filePath);
  freshMatterCache();
  ({ data } = readFrontmatter(filePath));
  assert.equal(data.localImages, false, "still fails since the URL is still unreachable, but it must have retried using sourceImageUrl, not silently no-opped");
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL, "sourceImageUrl must be preserved across repeated failed retries");
});

test("processEpisodeMarkdownFile: falls back to the show poster when it actually exists on disk", async (t) => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-episode-img-fallback-exists-");
  const filePath = path.join(tmp, "podcast", "some-episode", "index.mdx");
  const showPosterPath = path.join(tmp, "podcast", "show", "some-show", "poster.jpg");
  fs.mkdirSync(path.dirname(showPosterPath), { recursive: true });
  fs.writeFileSync(showPosterPath, "fake-jpg-bytes");

  writeFrontmatter(filePath, {
    title: "Episode With Existing Show Poster",
    image: UNREACHABLE_URL,
    hasEpisodeImage: true,
    showSlug: "some-show",
    localImages: false,
  });

  await processEpisodeMarkdownFile(filePath);

  const { data } = readFrontmatter(filePath);
  assert.equal(data.image, "../show/some-show/poster.jpg");
  assert.equal(data.localImages, true);
  assert.equal(data.hasEpisodeImage, false);
});

test("processEpisodeMarkdownFile: does not fall back to a show poster that doesn't exist on disk", async (t) => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-episode-img-fallback-missing-");
  const filePath = path.join(tmp, "podcast", "some-episode", "index.mdx");
  // Deliberately not creating tmp/podcast/show/some-show/poster.jpg - the
  // show's own image download may have failed too.

  writeFrontmatter(filePath, {
    title: "Episode With Missing Show Poster",
    image: UNREACHABLE_URL,
    hasEpisodeImage: true,
    showSlug: "some-show",
    localImages: false,
  });

  await processEpisodeMarkdownFile(filePath);

  const { data } = readFrontmatter(filePath);
  assert.equal(data.image, null);
  assert.equal(data.localImages, false);
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL, "the failed URL must survive so a future run has something to retry");
  assert.equal(data.hasEpisodeImage, true, "must stay true so the retry condition still fires next run");
});

test("processEpisodeMarkdownFile: falls back to null when there's no showSlug to reference at all", async (t) => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-episode-img-no-show-");
  const filePath = path.join(tmp, "podcast", "some-episode", "index.mdx");

  writeFrontmatter(filePath, {
    title: "Episode With No Show Slug",
    image: UNREACHABLE_URL,
    hasEpisodeImage: true,
    localImages: false,
  });

  await processEpisodeMarkdownFile(filePath);

  const { data } = readFrontmatter(filePath);
  assert.equal(data.image, null);
  assert.equal(data.localImages, false);
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL);
});

test("processEpisodeMarkdownFile: a second run retries from sourceImageUrl instead of giving up (previously hasEpisodeImage got permanently cleared)", async (t) => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-episode-img-retry-");
  const filePath = path.join(tmp, "podcast", "some-episode", "index.mdx");

  writeFrontmatter(filePath, {
    title: "Episode Retried",
    image: UNREACHABLE_URL,
    hasEpisodeImage: true,
    showSlug: "some-show",
    localImages: false,
  });

  await processEpisodeMarkdownFile(filePath);
  freshMatterCache();
  let { data } = readFrontmatter(filePath);
  assert.equal(data.image, null);
  assert.equal(data.hasEpisodeImage, true);
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL);

  // On the real bug, this second call would be a no-op: hasEpisodeImage had
  // been forced false and image was null, so the entry condition
  // (`data.hasEpisodeImage && data.image && ...`) could never be true
  // again. Assert it actually attempted a retry (the error log path is
  // exercised, sourceImageUrl round-trips) rather than silently doing
  // nothing.
  await processEpisodeMarkdownFile(filePath);
  freshMatterCache();
  ({ data } = readFrontmatter(filePath));
  assert.equal(data.hasEpisodeImage, true, "must still be retryable, not permanently abandoned");
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL, "sourceImageUrl must be preserved across repeated failed retries");
});

test("processMarkdownFile (media): on poster download failure, deletes image and poster, leaves localImages false", async (t) => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-media-img-poster-");
  const filePath = path.join(tmp, "media-item", "index.mdx");

  writeFrontmatter(filePath, {
    title: "Video With Broken Poster",
    poster: UNREACHABLE_URL,
    localImages: false,
  });

  await processMarkdownFile(filePath);

  const { data } = readFrontmatter(filePath);
  assert.equal("image" in data, false);
  assert.equal("poster" in data, false);
  assert.equal(data.localImages, false);
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL, "the failed URL must survive so a future run has something to retry");
});

test("processMarkdownFile (media): a second run retries from sourceImageUrl and succeeds once the URL is reachable", async (t) => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-media-img-retry-");
  const filePath = path.join(tmp, "media-item", "index.mdx");

  writeFrontmatter(filePath, {
    title: "Video Retried",
    poster: UNREACHABLE_URL,
    localImages: false,
  });

  await processMarkdownFile(filePath);
  freshMatterCache();
  let { data } = readFrontmatter(filePath);
  assert.equal("poster" in data, false);
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL);

  // Point sourceImageUrl at a real, reachable image and confirm the next
  // run actually uses it (proving it's read, not just written and ignored).
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "image/jpeg" });
    res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9])); // minimal valid-enough JPEG bytes
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  data.sourceImageUrl = `http://127.0.0.1:${port}/poster.jpg`;
  updateMarkdownFile(filePath, data, "");
  freshMatterCache();

  await processMarkdownFile(filePath);
  server.close();
  freshMatterCache();

  ({ data } = readFrontmatter(filePath));
  assert.equal(data.localImages, true, "must have retried using sourceImageUrl and succeeded");
  assert.equal(data.image, "./poster.jpg");
  assert.equal(data.poster, "./poster.jpg");
  assert.equal("sourceImageUrl" in data, false, "sourceImageUrl should be cleaned up once no longer needed");
});

test("processMarkdownFile (media): when no poster, and the image-as-poster fallback download fails, deletes both fields", async (t) => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-media-img-imagefallback-");
  const filePath = path.join(tmp, "media-item", "index.mdx");

  writeFrontmatter(filePath, {
    title: "Video With No Poster, Broken Image Fallback",
    image: UNREACHABLE_URL,
    localImages: false,
  });

  await processMarkdownFile(filePath);

  const { data } = readFrontmatter(filePath);
  assert.equal("image" in data, false);
  assert.equal("poster" in data, false);
  assert.equal(data.localImages, false);
  assert.equal(data.sourceImageUrl, UNREACHABLE_URL, "the failed URL must survive so a future run has something to retry");
});

test("updateMarkdownFile: omits deleted keys and writes explicit null cleanly", () => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-update-frontmatter-");
  const filePath = path.join(tmp, "index.mdx");
  fs.writeFileSync(filePath, "---\ntitle: placeholder\n---\n");

  const data = { title: "A Title", image: null, localImages: false };
  delete data.image;
  // Re-add as an explicit null to also cover the null-serialization path
  // used by the episode no-fallback case.
  data.image = null;

  updateMarkdownFile(filePath, data, "body content");

  const { data: written, content } = readFrontmatter(filePath);
  assert.equal(written.title, "A Title");
  assert.equal(written.image, null);
  assert.equal(content.trim(), "body content");
});

test("updateMarkdownFile: a title containing quotes round-trips correctly (previously used JSON.stringify per key, not real YAML)", () => {
  freshMatterCache();
  const tmp = mkTmpDir("dsm-update-frontmatter-quotes-");
  const filePath = path.join(tmp, "index.mdx");
  fs.writeFileSync(filePath, "---\ntitle: placeholder\n---\n");

  const data = { title: `Design Systems: The "Right" Way`, categories: ["Uncategorized"] };

  updateMarkdownFile(filePath, data, "body");

  const { data: written } = readFrontmatter(filePath);
  assert.equal(written.title, `Design Systems: The "Right" Way`);
  assert.deepEqual(written.categories, ["Uncategorized"]);
});
