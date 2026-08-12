import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import fs from "fs";
import os from "os";
import path from "path";

// getVideos.ts's processVideos (ignore-list filtering + per-video .mdx
// writing) and videoHandlers (routes a source's `type` to the right
// fetcher) previously had zero coverage. processVideos originally wrote
// straight to the real src/content/media/ directory via a hardcoded
// OUTPUT_DIR constant with no way to redirect it in a test, so it's been
// given an optional outputDir parameter (defaults to the original OUTPUT_DIR
// - behavior-preserving) purely so tests can point it at a tmp dir instead,
// mirroring the CONFIG.paths pattern getPodcasts.ts already uses for the
// same reason.
//
// youtube.ts is mocked the same way content-aggregator-youtube-api.test.mjs
// mocks googleapis, so these tests exercise routing rather than the real
// YouTube API. vimeo.ts and its "vimeo" handler were removed entirely (see
// ADR 0016) rather than fixed - there's nothing to mock or test here for it
// anymore.

const state = {
  getAllVideosFromChannel: async () => [],
  getAllVideosFromPlaylist: async () => [],
};

const youtubeTsUrl = new URL(
  "../../../content-aggregator/scripts/video/youtube.ts",
  import.meta.url,
);
mock.module(youtubeTsUrl, {
  exports: {
    getAllVideosFromChannel: (...args) => state.getAllVideosFromChannel(...args),
    getAllVideosFromPlaylist: (...args) => state.getAllVideosFromPlaylist(...args),
    getPosterUrl: () => "",
    formatDuration: () => "0:00:00",
    calculateTotalSeconds: () => 0,
  },
});

const { processVideos, videoHandlers } = await import(
  "../../../content-aggregator/scripts/video/getVideos.ts"
);

function mkTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeVideo(overrides = {}) {
  return {
    title: "A Video",
    publishedAt: "2025-01-01T00:00:00Z",
    thumbnails: { high: { url: "https://img/hq.jpg" } },
    videoUrl: "https://youtube.com/watch?v=abc123",
    duration: "0:05:00",
    durationSeconds: 300,
    privacyStatus: "public",
    description: "desc",
    ...overrides,
  };
}

// processVideos

test("processVideos: filters out ignored videos and reports the count, without writing a file for them", async () => {
  const tmp = mkTmpDir("dsm-process-videos-ignore-");
  const ignoredVideo = makeVideo({ title: "Ignored Video", videoUrl: "https://youtube.com/watch?v=ignored" });
  const keptVideo = makeVideo({ title: "Kept Video", videoUrl: "https://youtube.com/watch?v=kept" });

  const { processedVideos, ignoredCount } = await processVideos(
    [ignoredVideo, keptVideo],
    ["https://youtube.com/watch?v=ignored"],
    tmp,
  );

  assert.equal(ignoredCount, 1);
  assert.deepEqual(processedVideos.map((v) => v.videoUrl), ["https://youtube.com/watch?v=kept"]);
  assert.equal(fs.readdirSync(tmp).length, 1, "only the kept video's folder should have been created");
});

test("processVideos: writes an .mdx file per non-ignored video under the given outputDir", async () => {
  const tmp = mkTmpDir("dsm-process-videos-write-");
  const video = makeVideo({ title: "Design Systems 101" });

  await processVideos([video], [], tmp);

  const folders = fs.readdirSync(tmp);
  assert.equal(folders.length, 1);
  assert.equal(fs.existsSync(path.join(tmp, folders[0], "index.mdx")), true);
});

test("processVideos: defaults outputDir to the real content directory when not given (signature preserved)", () => {
  // Not calling this - just confirming the parameter is genuinely optional
  // so `processVideos(videos, ignoreList)` (the two-arg call main() makes)
  // still type-checks/behaves exactly as before this change.
  assert.equal(processVideos.length, 2, "outputDir must be a true optional param, not required");
});

// videoHandlers

test("videoHandlers['youtube-channel']: extracts the channel ID from the URL and delegates to getAllVideosFromChannel", async () => {
  let capturedChannelId;
  state.getAllVideosFromChannel = async (channelId) => {
    capturedChannelId = channelId;
    return [makeVideo()];
  };

  const videos = await videoHandlers["youtube-channel"](
    { type: "youtube-channel", url: "https://www.youtube.com/channel/UCabc123" },
    [],
  );

  assert.equal(capturedChannelId, "UCabc123");
  assert.equal(videos.length, 1);
});

test("videoHandlers['youtube-playlist']: extracts the playlist ID from the `list=` query param", async () => {
  let capturedPlaylistId;
  state.getAllVideosFromPlaylist = async (playlistId) => {
    capturedPlaylistId = playlistId;
    return [];
  };

  await videoHandlers["youtube-playlist"](
    { type: "youtube-playlist", url: "https://www.youtube.com/playlist?list=PLxyz789" },
    [],
  );

  assert.equal(capturedPlaylistId, "PLxyz789");
});

test("videoHandlers: no longer has a 'vimeo' entry (removed, not fixed - see ADR 0016)", () => {
  assert.deepEqual(Object.keys(videoHandlers).sort(), ["youtube-channel", "youtube-playlist"]);
});
