import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { createRequire } from "module";

// podcast.ts's API-calling functions (getPodcastByFeedUrl, getEpisodesFromFeed,
// searchPodcastByTitle, getTrendingPodcasts) previously had zero coverage -
// only their formatDuration delegation wrapper was tested. This mocks axios
// the same way content-aggregator-youtube-api.test.mjs mocks googleapis: one
// mock.module() call at file scope (axios.get is read fresh on every call,
// not captured once like youtube.ts's client, but the same mutable-dispatcher
// pattern keeps every test independent without fighting the CJS require
// cache across repeated mock.module() calls for the same specifier).

const state = {
  get: async () => ({ data: {} }),
};

// mock.module("axios", ...) alone doesn't work here: axios's package.json
// has a conditional "exports" map where the "require" condition (what
// podcast.ts's `require("axios")` actually resolves through) points at
// dist/node/axios.cjs, while resolving the bare "axios" specifier from this
// ESM test file follows the "default"/"import" condition to a different
// file (index.js). mock.module() only intercepts the exact resolved
// specifier it's given, so mocking the ESM-resolved path silently misses
// the CJS-resolved one podcast.ts actually loads (confirmed live: without
// this, the tests below made real network calls to the real Podcast Index
// API and got real 401s). Resolving through a CJS `require` first - the
// same resolution context podcast.ts itself uses - targets the right file.
const cjsRequire = createRequire(import.meta.url);
mock.module(cjsRequire.resolve("axios"), {
  exports: { default: { get: (...args) => state.get(...args) } },
});

// generateApiHeaders() reads these once at module load and hashes
// API_KEY + API_SECRET + timestamp via crypto - with both unset (the
// default in a bare test environment), that hash input is NaN, and
// crypto's update() throws on non-string/Buffer input. Every caller wraps
// that in its own try/catch (see ADR 0006's note on this exact behavior
// being preserved, not fixed), so an unset key doesn't crash the test - it
// silently makes every call fail before axios.get is ever reached, which
// would make every "happy path" test below look like it's exercising the
// mocked response when it's actually just hitting the error path. Setting
// dummy values keeps generateApiHeaders() from throwing so the mocked
// axios.get is the thing actually under test.
process.env.PODCAST_API_KEY = "test-key";
process.env.PODCAST_API_SECRET = "test-secret";

const {
  getPodcastByFeedUrl,
  getEpisodesFromFeed,
  searchPodcastByTitle,
  getTrendingPodcasts,
} = await import("../../../content-aggregator/scripts/podcast/podcast.ts");

test("getPodcastByFeedUrl: returns episodes + showData when the feed resolves", async () => {
  state.get = async (url) => {
    if (url.includes("byfeedurl")) {
      return { data: { feed: { id: "feed1", title: "The Show", url: "https://example.com/feed.xml" } } };
    }
    if (url.includes("byfeedid")) {
      return { data: { items: [] } };
    }
    throw new Error(`unexpected url ${url}`);
  };

  const result = await getPodcastByFeedUrl("https://example.com/feed.xml", []);

  assert.equal(result.showData.title, "The Show");
  assert.deepEqual(result.episodes, []);
});

test("getPodcastByFeedUrl: returns null showData when the API responds with no feed", async () => {
  state.get = async () => ({ data: {} });

  const result = await getPodcastByFeedUrl("https://example.com/missing.xml", []);

  assert.deepEqual(result, { episodes: [], showData: null });
});

test("getPodcastByFeedUrl: returns null showData (not a throw) when the request fails", async () => {
  state.get = async () => {
    throw new Error("network error");
  };

  const result = await getPodcastByFeedUrl("https://example.com/feed.xml", []);

  assert.deepEqual(result, { episodes: [], showData: null });
});

test("getEpisodesFromFeed: skips episodes shorter than 120 seconds and already-imported episodes", async () => {
  state.get = async () => ({
    data: {
      items: [
        { title: "Too Short", enclosureUrl: "https://example.com/short.mp3", duration: 90, datePublished: 1700000000 },
        { title: "Already Imported", enclosureUrl: "https://example.com/old.mp3", duration: 600, datePublished: 1700000000 },
        { title: "Keep Me", enclosureUrl: "https://example.com/keep.mp3", duration: 600, datePublished: 1700000000 },
      ],
    },
  });

  // feedInfo must be a real object, not the function's own `null` default -
  // getPodcastArtwork(feedInfo) reads feedInfo.artwork unconditionally and
  // throws on null. Every production call site always passes a real feed
  // object, so this mirrors that rather than exercising the unused default.
  const episodes = await getEpisodesFromFeed(
    "feed1",
    [{ episodeUrl: "https://example.com/old.mp3" }],
    {},
  );

  assert.deepEqual(episodes.map((e) => e.title), ["Keep Me"]);
});

test("getEpisodesFromFeed: falls back to the podcast's main artwork when an episode has no image of its own", async () => {
  state.get = async () => ({
    data: {
      items: [
        { title: "No Own Image", enclosureUrl: "https://example.com/a.mp3", duration: 600, datePublished: 1700000000, image: null },
      ],
    },
  });

  const episodes = await getEpisodesFromFeed("feed1", [], { artwork: "https://example.com/show-art.jpg" });

  assert.equal(episodes[0].episodeImageUrl, null);
  assert.equal(episodes[0].podcastImageUrl, "https://example.com/show-art.jpg");
  assert.equal(episodes[0].thumbnails.high.url, "https://example.com/show-art.jpg");
});

test("getEpisodesFromFeed: prefers the episode's own image over the podcast's artwork when both exist", async () => {
  state.get = async () => ({
    data: {
      items: [
        { title: "Has Own Image", enclosureUrl: "https://example.com/b.mp3", duration: 600, datePublished: 1700000000, image: "https://example.com/episode-art.jpg" },
      ],
    },
  });

  const episodes = await getEpisodesFromFeed("feed1", [], { artwork: "https://example.com/show-art.jpg" });

  assert.equal(episodes[0].episodeImageUrl, "https://example.com/episode-art.jpg");
  assert.equal(episodes[0].thumbnails.high.url, "https://example.com/episode-art.jpg");
});

test("getEpisodesFromFeed: decodes HTML entities; both straight quotes become an opening fancy quote (known quirk, not fixed)", async () => {
  state.get = async () => ({
    data: {
      items: [
        { title: `Design &amp; the "Right" Way`, enclosureUrl: "https://example.com/c.mp3", duration: 600, datePublished: 1700000000 },
      ],
    },
  });

  const episodes = await getEpisodesFromFeed("feed1", [], {});

  // replaceQuotesWithFancyQuotes runs title.replace(/"/g, "“").replace(/"/g, "”")
  // - the first .replace already consumes every literal `"` (global regex),
  // so the second .replace is always a no-op. Every quote becomes an
  // opening curly quote; a proper closing quote is never produced. Same bug
  // exists identically in youtube.ts's copy of this function - pinning the
  // real behavior here rather than the intended-but-never-happening one.
  assert.equal(episodes[0].title, `Design & the “Right“ Way`);
});

test("getEpisodesFromFeed: returns [] and does not throw when the request fails", async () => {
  state.get = async () => {
    throw new Error("feed unreachable");
  };

  const episodes = await getEpisodesFromFeed("feed1", []);

  assert.deepEqual(episodes, []);
});

test("searchPodcastByTitle: returns the first (most relevant) result", async () => {
  state.get = async (url) => {
    if (url.includes("byterm")) {
      return {
        data: {
          feeds: [
            { id: "best-match", title: "Best Match Show", url: "https://example.com/best.xml" },
            { id: "second", title: "Second Result", url: "https://example.com/second.xml" },
          ],
        },
      };
    }
    return { data: { items: [] } };
  };

  const result = await searchPodcastByTitle("design systems");

  assert.equal(result.showData.id, "best-match");
});

test("searchPodcastByTitle: returns null showData when nothing matches", async () => {
  state.get = async () => ({ data: { feeds: [] } });

  const result = await searchPodcastByTitle("nonexistent podcast xyz");

  assert.deepEqual(result, { episodes: [], showData: null });
});

test("getTrendingPodcasts: aggregates episodes+showData across every trending feed", async () => {
  state.get = async (url) => {
    if (url.includes("trending")) {
      return {
        data: {
          feeds: [
            { id: "trend1", title: "Trending One" },
            { id: "trend2", title: "Trending Two" },
          ],
        },
      };
    }
    return { data: { items: [] } };
  };

  const results = await getTrendingPodcasts([], 10);

  assert.deepEqual(results.map((r) => r.showData.id), ["trend1", "trend2"]);
});

test("getTrendingPodcasts: returns [] and does not throw when the request fails", async () => {
  state.get = async () => {
    throw new Error("trending endpoint down");
  };

  const results = await getTrendingPodcasts([], 10);

  assert.deepEqual(results, []);
});
