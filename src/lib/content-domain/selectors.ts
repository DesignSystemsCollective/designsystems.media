import { isDurationOneMinuteOrUnder } from "../../utils/isDurationOneMinuteOrUnder.ts";
import { convertToSlug } from "../../utils/convertToSlug.ts";
import {
  normalizeDate,
  normalizeDraftFlag,
  normalizeTaxonomyValues,
  toTaxonomySlug,
} from "./normalizers.ts";
import type {
  ContentCollections,
  ContentIndex,
  MediaEntry,
  MediaLikeEntry,
  PlaylistPageData,
  PodcastEntry,
  ResolvedPlaylist,
  ResolvedPlaylistItem,
  ShowEntry,
  ShowPageData,
  ShowWithLatestEpisode,
  SiteStats,
  TaxonomyIndex,
  TaxonomyItem,
  TaxonomyKind,
  TaxonomyPageData,
} from "./types.ts";

function sortByPublishedDateDesc<T extends MediaLikeEntry>(items: T[]): T[] {
  return [...items].sort(
    (left, right) => right.data.publishedAt.valueOf() - left.data.publishedAt.valueOf(),
  );
}

function sortByName(items: TaxonomyItem[]): TaxonomyItem[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function groupTaxonomyItems(items: TaxonomyItem[]): Record<string, TaxonomyItem[]> {
  return items.reduce<Record<string, TaxonomyItem[]>>((accumulator, item) => {
    const letter = item.name.charAt(0).toUpperCase();
    if (!accumulator[letter]) {
      accumulator[letter] = [];
    }

    accumulator[letter].push(item);
    return accumulator;
  }, {});
}

// One lookup per TaxonomyKind, each pointing at the matching frontmatter
// field. "tags" and "speakers" are the pre-existing freeform/controlled
// fields; "series"/"topics"/"tools" are ADR 0012's new controlled
// facets - present on the schema, but empty on every entry until the
// migration pass referenced in ADR 0012's Open questions runs.
const TAXONOMY_FIELD: Record<TaxonomyKind, keyof MediaLikeEntry["data"]> = {
  tags: "tags",
  speakers: "speakers",
  series: "series",
  topics: "topics",
  tools: "tools",
  systems: "systems",
};

// "tags" and "speakers" are freeform: different entries may spell the
// same value with different casing ("AI" / "ai" / "Ai"), so
// normalizeTaxonomyValues title-cases them to collapse variants into
// one taxonomy entry. series/topics/tools/systems are closed
// vocabularies enforced by a Zod enum (content.config.ts) - every
// entry already carries the exact canonical casing from taxonomy.ts,
// so running them through the same normalizer would corrupt
// deliberately-cased acronyms and brand names (AI -> Ai, ROI -> Roi,
// ADR 0014's GOV.UK -> Gov.uk, WhatsApp -> Whatsapp).
const FREEFORM_TAXONOMY_KINDS: ReadonlySet<TaxonomyKind> = new Set([
  "tags",
  "speakers",
]);

function buildTaxonomyIndex(
  kind: TaxonomyKind,
  items: MediaLikeEntry[],
): TaxonomyIndex {
  const grouped = new Map<string, TaxonomyItem>();
  const field = TAXONOMY_FIELD[kind];
  const isFreeform = FREEFORM_TAXONOMY_KINDS.has(kind);

  for (const item of items) {
    const raw = (item.data[field] as string[] | undefined) ?? [];
    const values = isFreeform
      ? normalizeTaxonomyValues(raw)
      : raw.filter(Boolean);

    for (const value of values) {
      const slug = isFreeform ? toTaxonomySlug(value) : convertToSlug(value);
      const current = grouped.get(slug);

      if (!current) {
        grouped.set(slug, {
          name: value,
          slug,
          count: 1,
          posts: [item],
        });
        continue;
      }

      current.count += 1;
      current.posts.push(item);
    }
  }

  const sortedItems = sortByName(
    [...grouped.values()].map((item) => ({
      ...item,
      posts: sortByPublishedDateDesc(item.posts),
    })),
  );

  return {
    kind,
    items: sortedItems,
    groupedItems: groupTaxonomyItems(sortedItems),
  };
}

function buildLatestEpisodeDateMap(podcasts: PodcastEntry[]): Map<string, Date> {
  const map = new Map<string, Date>();

  for (const podcast of podcasts) {
    const publishedAt = normalizeDate(podcast.data.publishedAt);
    if (!publishedAt) {
      continue;
    }

    const current = map.get(podcast.data.showSlug);
    if (!current || publishedAt > current) {
      map.set(podcast.data.showSlug, publishedAt);
    }
  }

  return map;
}

function buildResolvedPlaylists(
  playlists: ContentCollections["playlists"],
  videosBySlug: Map<string, MediaEntry>,
  podcastsBySlug: Map<string, PodcastEntry>,
): ResolvedPlaylist[] {
  return playlists
    .filter((playlist) => !normalizeDraftFlag(playlist.data.draft))
    .map((playlist) => {
      const resolvedItems = playlist.data.items
        .map<ResolvedPlaylistItem | null>((item) => {
          const entry =
            item.type === "media"
              ? videosBySlug.get(item.slug)
              : podcastsBySlug.get(item.slug);

          if (!entry) {
            return null;
          }

          return {
            type: item.type,
            entry,
          };
        })
        .filter(Boolean) as ResolvedPlaylistItem[];

      return {
        ...playlist,
        resolvedItems,
      };
    });
}

export function buildContentIndex(collections: ContentCollections): ContentIndex {
  const allVideos = collections.media;
  const allPodcasts = collections.podcast;
  const allShows = collections.show;
  const allPlaylists = collections.playlists;

  const videos = sortByPublishedDateDesc(
    allVideos.filter(
      (entry) =>
        !normalizeDraftFlag(entry.data.draft) &&
        !isDurationOneMinuteOrUnder(entry.data.duration),
    ),
  );
  const podcasts = sortByPublishedDateDesc(
    allPodcasts.filter((entry) => !normalizeDraftFlag(entry.data.draft)),
  );
  const shows = [...allShows]
    .filter((entry) => !normalizeDraftFlag(entry.data.draft))
    .sort((left, right) => right.data.lastUpdate.localeCompare(left.data.lastUpdate));
  const media = sortByPublishedDateDesc([...videos, ...podcasts]);

  const drafts = [
    ...allVideos.filter((entry) => normalizeDraftFlag(entry.data.draft)),
    ...allPodcasts.filter((entry) => normalizeDraftFlag(entry.data.draft)),
    ...allShows.filter((entry) => normalizeDraftFlag(entry.data.draft)),
    ...allPlaylists.filter((entry) => normalizeDraftFlag(entry.data.draft)),
  ];
  const underOneMinute = [...allVideos, ...allPodcasts].filter((entry) =>
    isDurationOneMinuteOrUnder(entry.data.duration),
  );
  const unsorted = media.filter((entry) =>
    normalizeTaxonomyValues(entry.data.tags).includes("Unsorted"),
  );

  // Astro 6 removed CollectionEntry.slug in favor of .id (which, for this
  // repo's folder-per-entry content layout, carries the same value slug
  // used to). These Maps keep their "BySlug" names for readability even
  // though the key now comes from .id - see ADR 0008.
  const videosBySlug = new Map(allVideos.map((entry) => [entry.id, entry]));
  const podcastsBySlug = new Map(allPodcasts.map((entry) => [entry.id, entry]));
  const showsBySlug = new Map(allShows.map((entry) => [entry.id, entry]));

  const latestEpisodeDateByShow = buildLatestEpisodeDateMap(podcasts);
  const showsByRecentEpisode: ShowWithLatestEpisode[] = [...shows]
    .map((show) => ({
      ...show,
      _latestEpisodeDate: latestEpisodeDateByShow.get(show.id) ?? new Date(0),
    }))
    .sort(
      (left, right) =>
        right._latestEpisodeDate.valueOf() - left._latestEpisodeDate.valueOf(),
    );

  const tagIndex = buildTaxonomyIndex("tags", media);
  const speakerIndex = buildTaxonomyIndex("speakers", media);
  const seriesIndex = buildTaxonomyIndex("series", media);
  const topicsIndex = buildTaxonomyIndex("topics", media);
  const toolsIndex = buildTaxonomyIndex("tools", media);
  const systemsIndex = buildTaxonomyIndex("systems", media);
  const resolvedPlaylists = buildResolvedPlaylists(
    allPlaylists,
    videosBySlug,
    podcastsBySlug,
  );

  const stats: SiteStats = {
    totalMedia: media.length,
    videos: videos.length,
    podcastShows: shows.length,
    podcastEpisodes: podcasts.length,
    tags: tagIndex.items.length,
    speakers: speakerIndex.items.length,
    topics: topicsIndex.items.length,
    series: seriesIndex.items.length,
    tools: toolsIndex.items.length,
    systems: systemsIndex.items.length,
    underMinute: underOneMinute.length,
    drafts: drafts.length,
    unsortedTag: unsorted.length,
  };

  return {
    allVideos,
    allPodcasts,
    allShows,
    allPlaylists,
    videos,
    podcasts,
    shows,
    media,
    drafts,
    underOneMinute,
    unsorted,
    tagIndex,
    speakerIndex,
    seriesIndex,
    topicsIndex,
    toolsIndex,
    systemsIndex,
    showsByRecentEpisode,
    latestEpisodeDateByShow,
    showsBySlug,
    podcastsBySlug,
    videosBySlug,
    resolvedPlaylists,
    stats,
  };
}

const TAXONOMY_INDEX: Record<TaxonomyKind, keyof ContentIndex> = {
  tags: "tagIndex",
  speakers: "speakerIndex",
  series: "seriesIndex",
  topics: "topicsIndex",
  tools: "toolsIndex",
  systems: "systemsIndex",
};

export function getTaxonomyPageData(
  index: ContentIndex,
  kind: TaxonomyKind,
  slug: string,
): TaxonomyPageData | null {
  const taxonomy = index[TAXONOMY_INDEX[kind]] as TaxonomyIndex;
  const item = taxonomy.items.find((entry) => entry.slug === slug);

  if (!item) {
    return null;
  }

  return {
    kind,
    item,
    posts: item.posts,
    videoPosts: item.posts.filter((entry) => entry.collection === "media") as MediaEntry[],
    podcastPosts: item.posts.filter(
      (entry) => entry.collection === "podcast",
    ) as PodcastEntry[],
  };
}

export function getShowPageData(index: ContentIndex, slug: string): ShowPageData | null {
  const show = index.showsBySlug.get(slug);
  if (!show || normalizeDraftFlag(show.data.draft)) {
    return null;
  }

  const episodes = sortByPublishedDateDesc(
    index.podcasts.filter((entry) => entry.data.showSlug === slug),
  );

  return {
    show,
    episodes,
    latestEpisodeDate: index.latestEpisodeDateByShow.get(slug) ?? null,
  };
}

export function getPlaylistPageData(
  index: ContentIndex,
  slug: string,
): PlaylistPageData | null {
  const playlist = index.resolvedPlaylists.find((entry) => entry.id === slug);
  return playlist ? { playlist } : null;
}
