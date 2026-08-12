import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import fs from "fs";
import os from "os";
import path from "path";
import matter from "gray-matter";

// ShowManager needs no mocking - it's pure in-memory bookkeeping, already
// exported. dataProcessors (newly exported alongside it, see getPodcasts.ts)
// is the orchestration layer that calls podcast.ts's API functions and
// feeds their results to ShowManager/fileGenerators; it's mocked here the
// same way content-aggregator-podcast-api.test.mjs mocks axios, so these
// tests exercise routing/error-handling logic without any network access.
//
// The main thing this pins down: the null-feed crash guard from ADR 0006.
// Before that fix, `showManager.createShow(null)` (whenever
// getPodcastByFeedUrl/searchPodcastByTitle/getTrendingPodcasts returned
// showData: null - a bad feed URL, missing credentials, network failure, or
// no search results) crashed on `feedData.id`, taking down the *entire*
// ingestion run over one bad source. It was fixed, but never had a
// regression test - this is that test.

const state = {
  getPodcastByFeedUrl: async () => ({ episodes: [], showData: null }),
  searchPodcastByTitle: async () => ({ episodes: [], showData: null }),
  getTrendingPodcasts: async () => [],
};

const podcastTsUrl = new URL(
  "../../../content-aggregator/scripts/podcast/podcast.ts",
  import.meta.url,
);
mock.module(podcastTsUrl, {
  exports: {
    getPodcastByFeedUrl: (...args) => state.getPodcastByFeedUrl(...args),
    searchPodcastByTitle: (...args) => state.searchPodcastByTitle(...args),
    getTrendingPodcasts: (...args) => state.getTrendingPodcasts(...args),
    getPodcastArtwork: () => "",
    formatDuration: () => "0:00:00",
  },
});

const { CONFIG, ShowManager, dataProcessors, utils } = await import(
  "../../../content-aggregator/scripts/podcast/getPodcasts.ts"
);

function mkTmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeFeed(overrides = {}) {
  return {
    id: "feed-id-1",
    title: "The Feed Show",
    url: "https://example.com/feed.xml",
    lastUpdateTime: 1700000000,
    ...overrides,
  };
}

// ShowManager

test("ShowManager.findExisting: matches by id first", () => {
  const existing = { id: "abc", slug: "existing-show", feedUrl: "https://example.com/old.xml" };
  const manager = new ShowManager([existing]);

  const found = manager.findExisting({ id: "abc", title: "Different Title", url: "https://example.com/new.xml" });

  assert.equal(found, existing);
});

test("ShowManager.findExisting: falls back to feedUrl or slug when id doesn't match", () => {
  const existing = { id: "old-id", slug: "the-feed-show", feedUrl: "https://example.com/feed.xml" };
  const manager = new ShowManager([existing]);

  const found = manager.findExisting({ id: "different-id", title: "The Feed Show", url: "https://example.com/somewhere-else.xml" });

  assert.equal(found, existing, "should match by slugified title even when id and feedUrl both differ");
});

test("ShowManager.createShow: returns the existing show instead of creating a duplicate", () => {
  const existing = { id: "abc", slug: "existing-show", title: "Existing Show", feedUrl: "https://example.com/feed.xml" };
  const manager = new ShowManager([existing]);

  const result = manager.createShow({ id: "abc", title: "Existing Show", url: "https://example.com/feed.xml" });

  assert.equal(result, existing);
  assert.equal(manager.getAllShows().length, 1);
});

test("ShowManager.createShow: creates and tracks a genuinely new show", () => {
  const manager = new ShowManager([]);

  const show = manager.createShow(makeFeed());

  assert.equal(show.title, "The Feed Show");
  assert.deepEqual(manager.getAllShows(), [show]);
  assert.equal(manager.findBySlug(show.slug), show);
});

// dataProcessors.processFeedSource

test("processFeedSource: on success, creates the show and writes its .mdx file", async () => {
  const tmp = mkTmpDir("dsm-feed-source-");
  CONFIG.paths.showsDir = path.join(tmp, "show");
  state.getPodcastByFeedUrl = async () => ({ episodes: [{ title: "Ep 1" }], showData: makeFeed() });

  const manager = new ShowManager([]);
  const result = await dataProcessors.processFeedSource(
    { type: "podcast-feed", url: "https://example.com/feed.xml" },
    manager,
    [],
  );

  assert.equal(result.show.title, "The Feed Show");
  assert.deepEqual(result.episodes, [{ title: "Ep 1" }]);

  const written = fs.readFileSync(path.join(CONFIG.paths.showsDir, result.show.slug, "index.mdx"), "utf-8");
  const { data } = matter(written);
  assert.equal(data.title, "The Feed Show");
});

test("processFeedSource: returns null instead of crashing when the feed fetch fails (ADR 0006 regression test)", async () => {
  state.getPodcastByFeedUrl = async () => ({ episodes: [], showData: null });
  const manager = new ShowManager([]);

  const result = await dataProcessors.processFeedSource(
    { type: "podcast-feed", url: "https://example.com/broken-feed.xml" },
    manager,
    [],
  );

  assert.equal(result, null);
  assert.equal(manager.getAllShows().length, 0, "should not have created a show from null showData");
});

// dataProcessors.processSearchSource

test("processSearchSource: on success, creates the show", async () => {
  const tmp = mkTmpDir("dsm-search-source-");
  CONFIG.paths.showsDir = path.join(tmp, "show");
  state.searchPodcastByTitle = async () => ({ episodes: [], showData: makeFeed({ title: "Found By Search" }) });

  const manager = new ShowManager([]);
  const result = await dataProcessors.processSearchSource(
    { type: "podcast-search", term: "design systems" },
    manager,
    [],
  );

  assert.equal(result.show.title, "Found By Search");
});

test("processSearchSource: returns null instead of crashing when nothing is found", async () => {
  state.searchPodcastByTitle = async () => ({ episodes: [], showData: null });
  const manager = new ShowManager([]);

  const result = await dataProcessors.processSearchSource(
    { type: "podcast-search", term: "nonexistent podcast xyz" },
    manager,
    [],
  );

  assert.equal(result, null);
});

// dataProcessors.processTrendingSource

test("processTrendingSource: skips entries with no show data without dropping the rest of the batch", async () => {
  const tmp = mkTmpDir("dsm-trending-source-");
  CONFIG.paths.showsDir = path.join(tmp, "show");
  state.getTrendingPodcasts = async () => [
    { episodes: [], showData: makeFeed({ id: "good-1", title: "Good Show One", url: "https://example.com/one.xml" }) },
    { episodes: [], showData: null },
    { episodes: [], showData: makeFeed({ id: "good-2", title: "Good Show Two", url: "https://example.com/two.xml" }) },
  ];

  const manager = new ShowManager([]);
  const results = await dataProcessors.processTrendingSource(
    { type: "trending" },
    manager,
    [],
  );

  assert.deepEqual(results.map((r) => r.show.title), ["Good Show One", "Good Show Two"]);
});

// utils.removeDuplicatesById

test("removeDuplicatesById: keeps the first occurrence of each id and drops later repeats", () => {
  const items = [
    { id: "a", title: "A v1" },
    { id: "b", title: "B" },
    { id: "a", title: "A v2 (duplicate, should be dropped)" },
  ];

  const result = utils.removeDuplicatesById(items);

  assert.deepEqual(result.map((i) => i.title), ["A v1", "B"]);
});

test("removeDuplicatesById: keeps every item that has no id, even if otherwise identical", () => {
  const items = [{ title: "No ID One" }, { title: "No ID Two" }];

  const result = utils.removeDuplicatesById(items);

  assert.equal(result.length, 2);
});
