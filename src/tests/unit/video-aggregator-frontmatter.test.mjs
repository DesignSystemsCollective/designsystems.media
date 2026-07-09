import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import getVideos from "../../../video-aggregator/scripts/getVideos.js";
import getPodcasts from "../../../video-aggregator/scripts/getPodcasts.js";

const { generateMdxFile } = getVideos;
const { CONFIG, fileGenerators } = getPodcasts;

function mkTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

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
    privacyStatus: "public",
    description: "A description.",
  };

  generateMdxFile(video, folderPath);
  const written = fs.readFileSync(path.join(folderPath, "index.mdx"), "utf-8");

  assert.match(written, /^title: "Design Systems 101"$/m);
  assert.match(written, /^publishedAt: "2025-01-01T00:00:00Z"$/m);
  assert.match(written, /^image: "https:\/\/img\/hq\.jpg"$/m);
  assert.match(written, /^poster: "https:\/\/img\/max\.jpg"$/m);
  assert.match(written, /^videoUrl: "https:\/\/youtube\.com\/watch\?v=abc123"$/m);
  assert.match(written, /^duration: "1:02:03"$/m);
  assert.match(written, /^privacyStatus: "public"$/m);
  assert.match(written, /^draft: true$/m);
  assert.match(written, /^tags: \["Unsorted"\]$/m);
  assert.match(written, /^speakers: \["Unsorted"\]$/m);
  assert.ok(written.endsWith("A description.\n"));
});

test("generateMdxFile: a title containing quotes produces broken YAML (known bug, pinned for Phase 2)", () => {
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

  // The embedded quotes are NOT escaped - this line is invalid YAML today.
  assert.match(written, /^title: "Design Systems: The "Right" Way"$/m);
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

// getPodcasts.js: fileGenerators.generateShowMdx / generateEpisodeMdx
//
// These read their output directories from the shared CONFIG object rather
// than accepting a path argument, so tests redirect CONFIG.paths to a temp
// directory before calling them.

test("generateShowMdx escapes the description but not the title (pinning the inconsistency)", () => {
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

  // description: escaped correctly
  assert.match(written, /^description: "A show about \\"design\\"\."$/m);
  // title: NOT escaped - broken YAML today, same bug class as getVideos.js
  assert.match(written, /^title: "The "Best" Show"$/m);
  assert.match(written, /^draft: false$/m);
  assert.match(written, /^type: "show"$/m);
});

test("generateEpisodeMdx: title is unescaped, HTML description converts to markdown, folder name is sanitized", () => {
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

  // Title is not escaped - same known bug as show/video frontmatter.
  assert.match(written, /^title: "Episode: The "Big" One"$/m);
  assert.match(written, /^showSlug: "my-show"$/m);
  assert.match(written, /^draft: false$/m);
  // No predefined speakers -> falls back to [podcastTitle]
  assert.match(written, /^speakers: \["The Best Show"\]$/m);
  // HTML description gets converted to Markdown via turndown
  assert.ok(written.trim().endsWith("Episode about **design**."));
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
