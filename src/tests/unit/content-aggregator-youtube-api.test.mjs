import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

// youtube.ts's getAllVideosFromChannel/getAllVideosFromPlaylist were
// previously only covered indirectly (their duration-delegation wrappers
// are tested in content-aggregator-duration.test.mjs, but the actual
// pagination/filtering/dedup logic that talks to the YouTube Data API had
// zero coverage). Real network calls aren't an option here (no API key in
// CI, and it'd make the suite flaky/slow), so this mocks the "googleapis"
// module instead.
//
// The mock is installed once, at module scope, not per-test: youtube.ts
// calls `google.youtube("v3")` exactly once, at its own module-load time,
// and caches the returned client in a module-level const. A second
// mock.module() call for the same specifier later doesn't retroactively
// change what youtube.ts is already holding (confirmed experimentally -
// Node's CJS require cache for "googleapis" persists across mock.module()
// restore/re-mock cycles, even when youtube.ts itself is re-imported via a
// cache-busting specifier). So instead of re-mocking per test, the fake
// client's methods are stable functions that delegate to a mutable `state`
// object - each test swaps `state.search`/`state.playlistItems`/
// `state.videos` before calling into youtube.ts, rather than swapping the
// mock itself.

const state = {
  search: async () => ({ data: { items: [] } }),
  playlistItems: async () => ({ data: { items: [] } }),
  videos: async () => ({ data: { items: [] } }),
};

mock.module("googleapis", {
  exports: {
    google: {
      youtube: () => ({
        search: { list: (...args) => state.search(...args) },
        playlistItems: { list: (...args) => state.playlistItems(...args) },
        videos: { list: (...args) => state.videos(...args) },
      }),
    },
  },
});

const { getAllVideosFromChannel, getAllVideosFromPlaylist } = await import(
  "../../../content-aggregator/scripts/video/youtube.ts"
);

// A single-page search.list response plus a videos.list responder keyed by
// video ID - covers the common single-page case without needing real
// pagination bookkeeping in every test.
function useSinglePageChannel({ items, videoDetailsById }) {
  state.search = async () => ({ data: { items, nextPageToken: undefined } });
  state.videos = async ({ id }) => ({ data: { items: [videoDetailsById[id]] } });
}

test("getAllVideosFromChannel: builds a Video from search + videos.list, applying duration/privacy/description", async () => {
  useSinglePageChannel({
    items: [
      {
        id: { videoId: "vid1" },
        snippet: { title: "A Talk", thumbnails: { high: { url: "https://img/hq.jpg" } }, publishedAt: "2025-01-01T00:00:00Z" },
      },
    ],
    videoDetailsById: {
      vid1: {
        snippet: { description: "Full description" },
        contentDetails: { duration: "PT10M5S" },
        status: { privacyStatus: "public" },
      },
    },
  });

  const videos = await getAllVideosFromChannel("channel1", []);

  assert.equal(videos.length, 1);
  assert.equal(videos[0].title, "A Talk");
  assert.equal(videos[0].videoUrl, "https://www.youtube.com/watch?v=vid1");
  assert.equal(videos[0].description, "Full description");
  assert.equal(videos[0].privacyStatus, "public");
  assert.equal(videos[0].duration, "0:10:05");
  assert.equal(videos[0].durationSeconds, 605);
});

test("getAllVideosFromChannel: skips Shorts (duration 60s or under)", async () => {
  useSinglePageChannel({
    items: [
      { id: { videoId: "short1" }, snippet: { title: "A Short", thumbnails: {}, publishedAt: "2025-01-01T00:00:00Z" } },
      { id: { videoId: "long1" }, snippet: { title: "A Real Video", thumbnails: {}, publishedAt: "2025-01-01T00:00:00Z" } },
    ],
    videoDetailsById: {
      short1: { snippet: {}, contentDetails: { duration: "PT45S" }, status: {} },
      long1: { snippet: {}, contentDetails: { duration: "PT2M" }, status: {} },
    },
  });

  const videos = await getAllVideosFromChannel("channel1", []);

  assert.deepEqual(videos.map((v) => v.videoUrl), ["https://www.youtube.com/watch?v=long1"]);
});

test("getAllVideosFromChannel: skips already-imported videos without calling videos.list for them", async () => {
  const videosListCalls = [];
  useSinglePageChannel({
    items: [
      { id: { videoId: "already-imported" }, snippet: { title: "Old", thumbnails: {}, publishedAt: "2025-01-01T00:00:00Z" } },
      { id: { videoId: "new1" }, snippet: { title: "New", thumbnails: {}, publishedAt: "2025-01-01T00:00:00Z" } },
    ],
    videoDetailsById: {
      new1: { snippet: {}, contentDetails: { duration: "PT5M" }, status: {} },
    },
  });
  const originalVideos = state.videos;
  state.videos = async (params) => {
    videosListCalls.push(params.id);
    return originalVideos(params);
  };

  const videos = await getAllVideosFromChannel("channel1", [
    { videoUrl: "https://www.youtube.com/watch?v=already-imported" },
  ]);

  assert.deepEqual(videos.map((v) => v.videoUrl), ["https://www.youtube.com/watch?v=new1"]);
  assert.deepEqual(videosListCalls, ["new1"], "should never call videos.list for an already-imported video");
});

test("getAllVideosFromChannel: follows nextPageToken across multiple pages", async () => {
  let call = 0;
  state.search = async () => {
    call += 1;
    if (call === 1) {
      return {
        data: {
          items: [{ id: { videoId: "page1vid" }, snippet: { title: "Page 1", thumbnails: {}, publishedAt: "2025-01-01T00:00:00Z" } }],
          nextPageToken: "page2",
        },
      };
    }
    return {
      data: {
        items: [{ id: { videoId: "page2vid" }, snippet: { title: "Page 2", thumbnails: {}, publishedAt: "2025-01-02T00:00:00Z" } }],
        nextPageToken: undefined,
      },
    };
  };
  state.videos = async () => ({
    data: { items: [{ snippet: {}, contentDetails: { duration: "PT5M" }, status: {} }] },
  });

  const videos = await getAllVideosFromChannel("channel1", []);

  assert.equal(call, 2, "should have paged through both responses");
  assert.deepEqual(videos.map((v) => v.videoUrl), [
    "https://www.youtube.com/watch?v=page1vid",
    "https://www.youtube.com/watch?v=page2vid",
  ]);
});

test("getAllVideosFromChannel: returns [] and does not throw when the API call fails", async () => {
  state.search = async () => {
    throw new Error("quota exceeded");
  };

  const videos = await getAllVideosFromChannel("channel1", []);

  assert.deepEqual(videos, []);
});

test("getAllVideosFromPlaylist: reads videoId/publishedAt/privacyStatus from playlistItems shape, not search shape", async () => {
  state.playlistItems = async () => ({
    data: {
      items: [
        {
          snippet: { resourceId: { videoId: "plvid1" }, title: "Playlist Video", thumbnails: {} },
          contentDetails: { videoPublishedAt: "2025-03-01T00:00:00Z" },
          status: { privacyStatus: "unlisted" },
        },
      ],
      nextPageToken: undefined,
    },
  });
  state.videos = async () => ({
    data: { items: [{ snippet: { description: "Desc" }, contentDetails: { duration: "PT3M" } }] },
  });

  const videos = await getAllVideosFromPlaylist("playlist1", []);

  assert.equal(videos.length, 1);
  assert.equal(videos[0].videoUrl, "https://www.youtube.com/watch?v=plvid1");
  assert.equal(videos[0].publishedAt, "2025-03-01T00:00:00Z");
  assert.equal(videos[0].privacyStatus, "unlisted");
  assert.equal(videos[0].description, "Desc");
});

test("getAllVideosFromPlaylist: skips Shorts and already-imported videos, same as the channel path", async () => {
  state.playlistItems = async () => ({
    data: {
      items: [
        { snippet: { resourceId: { videoId: "short1" }, title: "Short", thumbnails: {} }, contentDetails: { videoPublishedAt: "2025-01-01T00:00:00Z" }, status: { privacyStatus: "public" } },
        { snippet: { resourceId: { videoId: "already-imported" }, title: "Old", thumbnails: {} }, contentDetails: { videoPublishedAt: "2025-01-01T00:00:00Z" }, status: { privacyStatus: "public" } },
        { snippet: { resourceId: { videoId: "keep1" }, title: "Keep Me", thumbnails: {} }, contentDetails: { videoPublishedAt: "2025-01-01T00:00:00Z" }, status: { privacyStatus: "public" } },
      ],
      nextPageToken: undefined,
    },
  });
  state.videos = async ({ id }) => ({
    data: {
      items: [{
        snippet: {},
        contentDetails: { duration: id === "short1" ? "PT10S" : "PT5M" },
      }],
    },
  });

  const videos = await getAllVideosFromPlaylist("playlist1", [
    { videoUrl: "https://www.youtube.com/watch?v=already-imported" },
  ]);

  assert.deepEqual(videos.map((v) => v.videoUrl), ["https://www.youtube.com/watch?v=keep1"]);
});

test("getAllVideosFromPlaylist: returns [] and does not throw when the API call fails", async () => {
  state.playlistItems = async () => {
    throw new Error("playlist not found");
  };

  const videos = await getAllVideosFromPlaylist("playlist1", []);

  assert.deepEqual(videos, []);
});
