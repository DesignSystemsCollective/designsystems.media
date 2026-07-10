import test from "node:test";
import assert from "node:assert/strict";
import { buildContentIndex } from "../../lib/content-domain/selectors.ts";
import {
  normalizeLabel,
  normalizeTaxonomyValues,
  toTaxonomySlug,
} from "../../lib/content-domain/normalizers.ts";

// Astro 6 removed CollectionEntry.slug in favor of .id (see ADR 0008) -
// these fixtures model the real post-migration shape (id only, no slug).
// Playlist items still carry their own `slug` field (a plain
// frontmatter/schema field unrelated to Astro's CollectionEntry API -
// see types.ts), which is why the default items below are untouched.

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
      tags: ["design systems"],
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
      items: [
        { type: "media", slug: "video-entry" },
        { type: "podcast", slug: "podcast-entry" },
      ],
      draft: false,
      ...dataOverrides,
    },
  };
}

test("normalizes labels and taxonomy slugs", () => {
  assert.equal(normalizeLabel("dEsIgn toKenS"), "Design Tokens");
  assert.deepEqual(normalizeTaxonomyValues(["amy HUPE", "nathan CURTIS"]), [
    "Amy Hupe",
    "Nathan Curtis",
  ]);
  assert.equal(toTaxonomySlug("Design Tokens"), "design-tokens");
});

test("builds selector indexes and stats from one content snapshot", () => {
  const index = buildContentIndex({
    media: [
      createMediaEntry(),
      createMediaEntry({
        id: "short-video",
        title: "Short video",
        duration: "0:00:45",
      }),
    ] as never[],
    podcast: [createPodcastEntry()] as never[],
    show: [createShowEntry()] as never[],
    playlists: [createPlaylistEntry()] as never[],
  });

  assert.equal(index.videos.length, 1);
  assert.equal(index.podcasts.length, 1);
  assert.equal(index.showsByRecentEpisode[0].id, "show-entry");
  assert.equal(index.latestEpisodeDateByShow.get("show-entry")?.toISOString(), "2025-02-02T00:00:00.000Z");
  assert.equal(index.tagIndex.items.find((item) => item.slug === "design-tokens")?.count, 1);
  assert.equal(index.speakerIndex.items.find((item) => item.slug === "amy-hupe")?.count, 1);
  assert.equal(index.stats.totalMedia, 2);
  assert.equal(index.stats.underMinute, 1);
  assert.equal(index.resolvedPlaylists[0].resolvedItems.length, 2);
});
