import test from "node:test";
import assert from "node:assert/strict";
import getVideos from "../../../video-aggregator/scripts/getVideos.ts";
import getPodcasts from "../../../video-aggregator/scripts/getPodcasts.ts";

const { sanitizeTitle, createFolderName } = getVideos;
const { utils } = getPodcasts;

// getVideos.js: sanitizeTitle + createFolderName

test("sanitizeTitle strips quotes, colons, hashes, and punctuation", () => {
  assert.equal(
    sanitizeTitle(`DS: The "Right" Way #1 (v2)`),
    "DS The Right Way 1 v2",
  );
});

test("sanitizeTitle leaves plain titles untouched", () => {
  assert.equal(sanitizeTitle("Design Systems 101"), "Design Systems 101");
});

test("createFolderName slugifies and truncates to 7 words", () => {
  assert.equal(
    createFolderName(
      "This Is A Really Long Video Title With More Than Seven Words In It",
    ),
    "this-is-a-really-long-video-title",
  );
});

test("createFolderName does not pad short titles", () => {
  assert.equal(createFolderName("Short Title"), "short-title");
});

test("createFolderName removes quotes/colons before slugifying", () => {
  assert.equal(createFolderName(`DS: The "Right" Way`), "ds-the-right-way");
});

// getPodcasts.js: utils.generateSlug
// Note this is a different truncation strategy than createFolderName above
// (character-length cutoff vs. word-count cutoff) - another duplication
// this pins as-is rather than silently unifying.

test("generateSlug truncates by character length (default 50), not word count", () => {
  const slug = utils.generateSlug(
    "This Is A Really Long Podcast Episode Title That Exceeds Fifty Characters For Sure",
  );
  assert.equal(slug, "this-is-a-really-long-podcast-episode-title-that-e");
  assert.ok(slug.length <= 51, "should be truncated to roughly maxLength characters");
});

test("generateSlug respects a custom maxLength", () => {
  assert.equal(utils.generateSlug("Short Episode", 5), "short");
});

test("generateSlug leaves short titles untouched", () => {
  assert.equal(utils.generateSlug("Short Episode"), "short-episode");
});
