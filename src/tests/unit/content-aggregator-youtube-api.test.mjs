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
// object - each test swaps `state.channels`/`state.playlistItems`/
// `state.videos` before calling into youtube.ts, rather than swapping the
// mock itself.
//
// getAllVideosFromChannel no longer calls search.list at all (see ADR
// 0017) - it looks up the channel's uploads playlist via channels.list,
// then delegates to getAllVideosFromPlaylist. So its tests below mock
// channels.list + playlistItems.list/videos.list, the same shapes the
// playlist tests use, rather than a search.list response shape.

const state = {
  channels: async () => ({ data: { items: [] } }),
  playlistItems: async () => ({ data: { items: [] } }),
  videos: async () => ({ data: { items: [] } }),
};

mock.module("googleapis", {
  exports: {
    google: {
      youtube: () => ({
        channels: { list: (...args) => state.channels(...args) },
        playlistItems: { list: (...args) => state.playlistItems(...args) },
        videos: { list: (...args) => state.videos(...args) },
      }),
    },
  },
});

const { getAllVideosFromChannel, getAllVideosFromPlaylist, getUploadsPlaylistId } = await import(
  "../../../content-aggregator/scripts/video/youtube.ts"
);

function useUploadsPlaylist(playlistId) {
  state.channels = async () => ({
    data: { items: [{ contentDetails: { relatedPlaylists: { uploads: playlistId } } }] },
  });
}

// getUploadsPlaylistId

test("getUploadsPlaylistId: reads the uploads playlist ID out of channels.list's response", async () => {
  useUploadsPlaylist("UUabc123uploads");

  const playlistId = await getUploadsPlaylistId("channel1");

  assert.equal(playlistId, "UUabc123uploads");
});

test("getUploadsPlaylistId: returns null for a channel ID that doesn't resolve to anything", async () => {
  state.channels = async () => ({ data: { items: [] } });

  const playlistId = await getUploadsPlaylistId("nonexistent-channel");

  assert.equal(playlistId, null);
});

// getAllVideosFromChannel

test("getAllVideosFromChannel: looks up the uploads playlist, then delegates to the playlist-fetching path", async () => {
  useUploadsPlaylist("UUuploads1");
  state.playlistItems = async () => ({
    data: {
      items: [
        {
          snippet: { resourceId: { videoId: "vid1" }, title: "A Talk", thumbnails: { high: { url: "https://img/hq.jpg" } } },
          contentDetails: { videoPublishedAt: "2025-01-01T00:00:00Z" },
          status: { privacyStatus: "public" },
        },
      ],
      nextPageToken: undefined,
    },
  });
  state.videos = async () => ({
    data: { items: [{ snippet: { description: "Full description" }, contentDetails: { duration: "PT10M5S" } }] },
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

test("getAllVideosFromChannel: returns [] without calling playlistItems.list when the channel has no uploads playlist", async () => {
  state.channels = async () => ({ data: { items: [] } });
  let playlistItemsCalled = false;
  state.playlistItems = async () => {
    playlistItemsCalled = true;
    return { data: { items: [] } };
  };

  const videos = await getAllVideosFromChannel("bad-channel", []);

  assert.deepEqual(videos, []);
  assert.equal(playlistItemsCalled, false);
});

test("getAllVideosFromChannel: returns [] and does not throw when the uploads-playlist lookup fails", async () => {
  state.channels = async () => {
    throw new Error("quota exceeded");
  };

  const videos = await getAllVideosFromChannel("channel1", []);

  assert.deepEqual(videos, []);
});

// getAllVideosFromPlaylist - also exercised indirectly above via
// getAllVideosFromChannel's delegation, but tested directly here for the
// pagination/Shorts/dedup rules that both entry points now share.

test("getAllVideosFromPlaylist: reads videoId/publishedAt/privacyStatus from playlistItems shape", async () => {
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

test("getAllVideosFromPlaylist: skips Shorts and already-imported videos", async () => {
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

test("getAllVideosFromPlaylist: follows nextPageToken across multiple pages", async () => {
  let call = 0;
  state.playlistItems = async () => {
    call += 1;
    if (call === 1) {
      return {
        data: {
          items: [{ snippet: { resourceId: { videoId: "page1vid" }, title: "Page 1", thumbnails: {} }, contentDetails: { videoPublishedAt: "2025-01-01T00:00:00Z" }, status: { privacyStatus: "public" } }],
          nextPageToken: "page2",
        },
      };
    }
    return {
      data: {
        items: [{ snippet: { resourceId: { videoId: "page2vid" }, title: "Page 2", thumbnails: {} }, contentDetails: { videoPublishedAt: "2025-01-02T00:00:00Z" }, status: { privacyStatus: "public" } }],
        nextPageToken: undefined,
      },
    };
  };
  state.videos = async () => ({
    data: { items: [{ snippet: {}, contentDetails: { duration: "PT5M" } }] },
  });

  const videos = await getAllVideosFromPlaylist("playlist1", []);

  assert.equal(call, 2, "should have paged through both responses");
  assert.deepEqual(videos.map((v) => v.videoUrl), [
    "https://www.youtube.com/watch?v=page1vid",
    "https://www.youtube.com/watch?v=page2vid",
  ]);
});

test("getAllVideosFromPlaylist: returns [] and does not throw when the API call fails", async () => {
  state.playlistItems = async () => {
    throw new Error("playlist not found");
  };

  const videos = await getAllVideosFromPlaylist("playlist1", []);

  assert.deepEqual(videos, []);
});
