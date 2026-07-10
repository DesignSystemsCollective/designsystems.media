import test from "node:test";
import assert from "node:assert/strict";
import {
  buildContentIndex,
  getPlaylistPageData,
  getShowPageData,
  getTaxonomyPageData,
} from "../../lib/content-domain/selectors.ts";

// Mirrors the fixture shape used in content-domain.test.ts. Kept local
// rather than shared/exported so each test file stays self-contained.

// Astro 6 removed CollectionEntry.slug in favor of .id (see ADR 0008) -
// these fixtures model the real post-migration shape (id only, no slug),
// so `id` is pulled out of overrides separately rather than being
// swallowed by the `...overrides` spread into `data` below. Playlist
// items still carry their own `slug` field (a plain frontmatter/schema
// field unrelated to Astro's CollectionEntry API - see types.ts), which
// is why `createPlaylistEntry`'s default item below is untouched.

function createMediaEntry(overrides: Record<string, unknown> = {}) {
  const { id, ...dataOverrides } = overrides;
  return {
    id: id ?? "video-entry",
    body: "",
    collection: "media",
    data: {
      title: "Video Entry",
      publishedAt: new Date("2025-01-02T00:00:00Z"),
      localImages: false,
      draft: false,
      tags: ["design tokens"],
      speakers: ["jina anne"],
      duration: "0:10:00",
      ...dataOverrides,
    },
  };
}

function createPodcastEntry(overrides: Record<string, unknown> = {}) {
  const { id, ...dataOverrides } = overrides;
  return {
    id: id ?? "podcast-entry",
    body: "",
    collection: "podcast",
    data: {
      title: "Podcast Entry",
      publishedAt: new Date("2025-02-02T00:00:00Z"),
      localImages: false,
      draft: false,
      podcastTitle: "Podcast",
      showSlug: "show-entry",
      hasEpisodeImage: false,
      tags: ["design tokens"],
      speakers: ["amy hupe"],
      duration: "0:45:00",
      ...dataOverrides,
    },
  };
}

function createShowEntry(overrides: Record<string, unknown> = {}) {
  const { id, ...dataOverrides } = overrides;
  return {
    id: id ?? "show-entry",
    body: "",
    collection: "show",
    data: {
      title: "Show Entry",
      description: "Desc",
      feedUrl: "https://example.com/feed.xml",
      dateAdded: "2025-01-01",
      lastUpdate: "2025-03-01",
      categories: ["Podcast"],
      guid: "show-guid",
      type: "show",
      draft: false,
      speakers: ["Host"],
      episodeCount: 1,
      localImages: false,
      ...dataOverrides,
    },
  };
}

function createPlaylistEntry(overrides: Record<string, unknown> = {}) {
  const { id, ...dataOverrides } = overrides;
  return {
    id: id ?? "playlist-entry",
    body: "",
    collection: "playlists",
    data: {
      name: "Playlist",
      description: "Curated",
      items: [{ type: "media", slug: "video-entry" }],
      draft: false,
      ...dataOverrides,
    },
  };
}

// getShowPageData: draft filtering

test("getShowPageData returns null for a draft show", () => {
  const index = buildContentIndex({
    media: [] as never[],
    podcast: [] as never[],
    show: [createShowEntry({ draft: true })] as never[],
    playlists: [] as never[],
  });

  assert.equal(getShowPageData(index, "show-entry"), null);
});

test("getShowPageData returns null for an unknown slug", () => {
  const index = buildContentIndex({
    media: [] as never[],
    podcast: [] as never[],
    show: [createShowEntry()] as never[],
    playlists: [] as never[],
  });

  assert.equal(getShowPageData(index, "does-not-exist"), null);
});

test("getShowPageData excludes draft episodes and computes latestEpisodeDate from published ones only", () => {
  const index = buildContentIndex({
    media: [] as never[],
    podcast: [
      createPodcastEntry({
        id: "published-episode",
        publishedAt: new Date("2025-02-02T00:00:00Z"),
      }),
      createPodcastEntry({
        id: "draft-episode",
        draft: true,
        publishedAt: new Date("2025-05-01T00:00:00Z"),
      }),
    ] as never[],
    show: [createShowEntry()] as never[],
    playlists: [] as never[],
  });

  const page = getShowPageData(index, "show-entry");

  assert.ok(page);
  assert.equal(page?.episodes.length, 1);
  assert.equal(page?.episodes[0].id, "published-episode");
  // The draft episode's later date must not leak into latestEpisodeDate.
  assert.equal(page?.latestEpisodeDate?.toISOString(), "2025-02-02T00:00:00.000Z");
});

test("getShowPageData reports latestEpisodeDate as null when the show has no published episodes", () => {
  const index = buildContentIndex({
    media: [] as never[],
    podcast: [] as never[],
    show: [createShowEntry()] as never[],
    playlists: [] as never[],
  });

  const page = getShowPageData(index, "show-entry");

  assert.ok(page);
  assert.deepEqual(page?.episodes, []);
  assert.equal(page?.latestEpisodeDate, null);
});

// getTaxonomyPageData: null handling + video/podcast split

test("getTaxonomyPageData returns null for an unknown slug", () => {
  const index = buildContentIndex({
    media: [createMediaEntry()] as never[],
    podcast: [] as never[],
    show: [] as never[],
    playlists: [] as never[],
  });

  assert.equal(getTaxonomyPageData(index, "tags", "does-not-exist"), null);
});

test("getTaxonomyPageData splits posts into videoPosts and podcastPosts", () => {
  const index = buildContentIndex({
    media: [createMediaEntry()] as never[],
    podcast: [createPodcastEntry()] as never[],
    show: [createShowEntry()] as never[],
    playlists: [] as never[],
  });

  const page = getTaxonomyPageData(index, "tags", "design-tokens");

  assert.ok(page);
  assert.equal(page?.posts.length, 2);
  assert.equal(page?.videoPosts.length, 1);
  assert.equal(page?.videoPosts[0].id, "video-entry");
  assert.equal(page?.podcastPosts.length, 1);
  assert.equal(page?.podcastPosts[0].id, "podcast-entry");
});

// getPlaylistPageData: null handling

test("getPlaylistPageData returns null for an unknown slug", () => {
  const index = buildContentIndex({
    media: [] as never[],
    podcast: [] as never[],
    show: [] as never[],
    playlists: [createPlaylistEntry()] as never[],
  });

  assert.equal(getPlaylistPageData(index, "does-not-exist"), null);
});

test("getPlaylistPageData returns the resolved playlist for a known slug", () => {
  const index = buildContentIndex({
    media: [createMediaEntry()] as never[],
    podcast: [] as never[],
    show: [] as never[],
    playlists: [createPlaylistEntry()] as never[],
  });

  const page = getPlaylistPageData(index, "playlist-entry");

  assert.ok(page);
  assert.equal(page?.playlist.id, "playlist-entry");
  assert.equal(page?.playlist.resolvedItems.length, 1);
});

// buildResolvedPlaylists (exercised via buildContentIndex): broken refs + drafts

test("a playlist item referencing a missing slug is silently dropped, not thrown", () => {
  const index = buildContentIndex({
    media: [createMediaEntry()] as never[],
    podcast: [] as never[],
    show: [] as never[],
    playlists: [
      createPlaylistEntry({
        items: [
          { type: "media", slug: "video-entry" },
          { type: "media", slug: "this-slug-does-not-exist" },
          { type: "podcast", slug: "also-missing" },
        ],
      }),
    ] as never[],
  });

  assert.equal(index.resolvedPlaylists.length, 1);
  assert.equal(index.resolvedPlaylists[0].resolvedItems.length, 1);
  assert.equal(index.resolvedPlaylists[0].resolvedItems[0].entry.id, "video-entry");
});

test("draft playlists are excluded from resolvedPlaylists entirely", () => {
  const index = buildContentIndex({
    media: [createMediaEntry()] as never[],
    podcast: [] as never[],
    show: [] as never[],
    playlists: [createPlaylistEntry({ draft: true })] as never[],
  });

  assert.deepEqual(index.resolvedPlaylists, []);
});
