import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import matter from "gray-matter";
import getVideos from "../../../content-aggregator/scripts/video/getVideos.ts";
import getPodcasts from "../../../content-aggregator/scripts/podcast/getPodcasts.ts";

const { generateMdxFile } = getVideos;
const { CONFIG, fileGenerators } = getPodcasts;

function mkTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// As of Phase 2, frontmatter is built via shared.js's writeContentFile
// (gray-matter's stringify) instead of hand-rolled template literals, so
// these tests parse the written file back with gray-matter and assert on
// the resulting data rather than matching exact YAML text - the whole
// point of the fix is that arbitrary strings round-trip correctly
// regardless of the serializer's formatting choices.

// getVideos.js: generateMdxFile

test("generateMdxFile writes the expected frontmatter shape", () => {
  const tmp = mkTmpDir("dsm-video-");
  const folderPath = path.join(tmp, "some-video");

  const video = {
    title: "Design Systems 101",
    publishedAt: "2025-01-01T00:00:00Z",
    thumbnails: {
      high: { url: "https://img/hq.jpg" },
      maxres: { url: "https://img/max.jpg" },
    },
    videoUrl: "https://youtube.com/watch?v=abc123",
    duration: "1:02:03",
    durationSeconds: 3723,
    privacyStatus: "public",
    description: "A description.",
  };

  generateMdxFile(video, folderPath);
  const written = fs.readFileSync(path.join(folderPath, "index.mdx"), "utf-8");
  const { data, content } = matter(written);

  assert.equal(data.title, "Design Systems 101");
  assert.equal(data.publishedAt, "2025-01-01T00:00:00Z");
  assert.equal(data.image, "https://img/hq.jpg");
  assert.equal(data.poster, "https://img/max.jpg");
  assert.equal(data.videoUrl, "https://youtube.com/watch?v=abc123");
  assert.equal(data.duration, "1:02:03");
  assert.equal(data.durationSeconds, 3723);
  assert.equal(data.privacyStatus, "public");
  assert.equal(data.draft, true);
  assert.deepEqual(data.tags, ["Unsorted"]);
  assert.deepEqual(data.speakers, ["Unsorted"]);
  assert.equal(content.trim(), "A description.");
});

test("generateMdxFile: a title containing quotes round-trips correctly (Phase 2 fix)", () => {
  const tmp = mkTmpDir("dsm-video-quote-");
  const folderPath = path.join(tmp, "quoted-video");

  const video = {
    title: `Design Systems: The "Right" Way`,
    publishedAt: "2025-01-01T00:00:00Z",
    thumbnails: { high: { url: "https://img/hq.jpg" } },
    videoUrl: "https://youtube.com/watch?v=abc123",
    duration: "1:02:03",
    privacyStatus: "public",
    description: "A description.",
  };

  generateMdxFile(video, folderPath);
  const written = fs.readFileSync(path.join(folderPath, "index.mdx"), "utf-8");
  const { data } = matter(written);

  // Previously this produced invalid YAML (unescaped embedded quotes).
  // It must now round-trip to the exact original title.
  assert.equal(data.title, `Design Systems: The "Right" Way`);
});

test("generateMdxFile does not overwrite an existing file", () => {
  const tmp = mkTmpDir("dsm-video-skip-");
  const folderPath = path.join(tmp, "existing-video");

  const original = {
    title: "Original Title",
    publishedAt: "2025-01-01T00:00:00Z",
    thumbnails: { high: { url: "https://img/hq.jpg" } },
    videoUrl: "https://youtube.com/watch?v=abc123",
    duration: "1:00:00",
    privacyStatus: "public",
    description: "Original description.",
  };

  generateMdxFile(original, folderPath);
  const before = fs.readFileSync(path.join(folderPath, "index.mdx"), "utf-8");

  generateMdxFile({ ...original, title: "New Title" }, folderPath);
  const after = fs.readFileSync(path.join(folderPath, "index.mdx"), "utf-8");

  assert.equal(before, after);
});

test("generateMdxFile writes durationSeconds as null rather than crashing when absent", () => {
  const tmp = mkTmpDir("dsm-video-no-duration-");
  const folderPath = path.join(tmp, "no-duration-video");

  // youtube.ts only sets durationSeconds when contentDetails.duration is
  // present in the API response - it's genuinely absent otherwise, not just
  // a Vimeo-specific case (Vimeo support was removed, see ADR 0016).
  // gray-matter's YAML serializer throws on `undefined` (unlike
  // JSON.stringify, which silently drops it), so this must not blow up.
  const video = {
    title: "A Video With No Duration Data",
    publishedAt: "2025-01-01T00:00:00Z",
    thumbnails: { high: { url: "https://img/hq.jpg" } },
    videoUrl: "https://www.youtube.com/watch?v=noduration",
    duration: "",
    privacyStatus: "public",
    description: "desc",
  };

  assert.doesNotThrow(() => generateMdxFile(video, folderPath));

  const written = fs.readFileSync(path.join(folderPath, "index.mdx"), "utf-8");
  const { data } = matter(written);
  assert.equal(data.durationSeconds, null);
});

// getPodcasts.js: fileGenerators.generateShowMdx / generateEpisodeMdx
//
// These read their output directories from the shared CONFIG object rather
// than accepting a path argument, so tests redirect CONFIG.paths to a temp
// directory before calling them.

test("generateShowMdx: title and description both round-trip correctly (Phase 2 fix)", () => {
  const tmp = mkTmpDir("dsm-show-");
  CONFIG.paths.showsDir = path.join(tmp, "show");

  const show = {
    slug: "my-show",
    title: `The "Best" Show`,
    description: `A show about "design".`,
    speakers: "Host Name",
    feedUrl: "https://example.com/feed.xml",
    websiteUrl: "https://example.com",
    imageUrl: "https://example.com/art.jpg",
    dateAdded: "2025-01-01",
    lastUpdate: "2025-01-02T00:00:00.000Z",
    categories: ["Design"],
    language: "en",
    explicit: false,
    episodeCount: 5,
    itunesId: 123,
    guid: "show-guid",
    medium: "podcast",
    dead: 0,
    locked: 0,
  };

  fileGenerators.generateShowMdx(show);
  const written = fs.readFileSync(
    path.join(CONFIG.paths.showsDir, "my-show", "index.mdx"),
    "utf-8",
  );
  const { data } = matter(written);

  // Both were previously inconsistent - description was escaped by hand,
  // title was not. Both must now round-trip to the original value.
  assert.equal(data.title, `The "Best" Show`);
  assert.equal(data.description, `A show about "design".`);
  assert.deepEqual(data.speakers, ["Host Name"]);
  assert.equal(data.draft, false);
  assert.equal(data.type, "show");
});

test("generateShowMdx falls back to Uncategorized for empty categories", () => {
  const tmp = mkTmpDir("dsm-show-empty-cat-");
  CONFIG.paths.showsDir = path.join(tmp, "show");

  const show = {
    slug: "no-category-show",
    title: "No Category Show",
    description: "Desc",
    speakers: "Host",
    feedUrl: "https://example.com/feed.xml",
    websiteUrl: "https://example.com",
    imageUrl: "https://example.com/art.jpg",
    dateAdded: "2025-01-01",
    lastUpdate: "2025-01-02T00:00:00.000Z",
    categories: [],
    language: "en",
    explicit: false,
    episodeCount: 0,
    itunesId: null,
    guid: "guid",
    medium: "podcast",
    dead: 0,
    locked: 0,
  };

  fileGenerators.generateShowMdx(show);
  const written = fs.readFileSync(
    path.join(CONFIG.paths.showsDir, "no-category-show", "index.mdx"),
    "utf-8",
  );
  const { data } = matter(written);

  assert.deepEqual(data.categories, ["Uncategorized"]);
  assert.equal(data.itunesId, null);
});

test("generateEpisodeMdx: title round-trips correctly, HTML description converts to markdown, folder name is sanitized", () => {
  const tmp = mkTmpDir("dsm-episode-");
  CONFIG.paths.episodesDir = path.join(tmp, "podcast");

  const episode = {
    title: `Episode: The "Big" One`,
    publishedAt: "2025-02-01T00:00:00Z",
    episodeUrl: "https://example.com/ep1",
    audioUrl: "https://example.com/ep1.mp3",
    podcastTitle: "The Best Show",
    duration: "0:45:00",
    durationSeconds: 2700,
    feedUrl: "https://example.com/feed.xml",
    guid: "ep-guid",
    explicit: false,
    description: "<p>Episode about <b>design</b>.</p>",
  };

  fileGenerators.generateEpisodeMdx(episode, "my-show", null, null);

  const folders = fs.readdirSync(CONFIG.paths.episodesDir);
  assert.deepEqual(folders, ["episode-the-big-one"]);

  const written = fs.readFileSync(
    path.join(CONFIG.paths.episodesDir, folders[0], "index.mdx"),
    "utf-8",
  );
  const { data, content } = matter(written);

  // Previously unescaped - same known bug as show/video frontmatter.
  assert.equal(data.title, `Episode: The "Big" One`);
  assert.equal(data.showSlug, "my-show");
  assert.equal(data.draft, false);
  assert.equal(data.image, null);
  assert.equal(data.season, null);
  assert.equal(data.episode, null);
  // No predefined speakers -> falls back to [podcastTitle]
  assert.deepEqual(data.speakers, ["The Best Show"]);
  // HTML description gets converted to Markdown via turndown
  assert.equal(content.trim(), "Episode about **design**.");
});

test("generateEpisodeMdx does not overwrite an existing episode file", () => {
  const tmp = mkTmpDir("dsm-episode-skip-");
  CONFIG.paths.episodesDir = path.join(tmp, "podcast");

  const episode = {
    title: "Original Episode",
    publishedAt: "2025-02-01T00:00:00Z",
    episodeUrl: "https://example.com/ep1",
    audioUrl: "https://example.com/ep1.mp3",
    podcastTitle: "The Best Show",
    duration: "0:45:00",
    durationSeconds: 2700,
    feedUrl: "https://example.com/feed.xml",
    guid: "ep-guid",
    explicit: false,
    description: "Original description.",
  };

  fileGenerators.generateEpisodeMdx(episode, "my-show", null, null);
  const folders = fs.readdirSync(CONFIG.paths.episodesDir);
  const filePath = path.join(CONFIG.paths.episodesDir, folders[0], "index.mdx");
  const before = fs.readFileSync(filePath, "utf-8");

  fileGenerators.generateEpisodeMdx(
    { ...episode, title: "Original Episode" },
    "my-show",
    null,
    null,
  );
  const after = fs.readFileSync(filePath, "utf-8");

  assert.equal(before, after);
});
