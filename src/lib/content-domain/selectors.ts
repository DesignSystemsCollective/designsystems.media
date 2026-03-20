import { isDurationOneMinuteOrUnder } from "../../utils/isDurationOneMinuteOrUnder.ts";
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

function buildTaxonomyIndex(
  kind: TaxonomyKind,
  items: MediaLikeEntry[],
): TaxonomyIndex {
  const grouped = new Map<string, TaxonomyItem>();

  for (const item of items) {
    const values =
      kind === "tags"
        ? normalizeTaxonomyValues(item.data.tags)
        : normalizeTaxonomyValues(item.data.speakers);

    for (const value of values) {
      const slug = toTaxonomySlug(value);
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

  const videosBySlug = new Map(allVideos.map((entry) => [entry.slug, entry]));
  const podcastsBySlug = new Map(allPodcasts.map((entry) => [entry.slug, entry]));
  const showsBySlug = new Map(allShows.map((entry) => [entry.slug, entry]));

  const latestEpisodeDateByShow = buildLatestEpisodeDateMap(podcasts);
  const showsByRecentEpisode: ShowWithLatestEpisode[] = [...shows]
    .map((show) => ({
      ...show,
      _latestEpisodeDate: latestEpisodeDateByShow.get(show.slug) ?? new Date(0),
    }))
    .sort(
      (left, right) =>
        right._latestEpisodeDate.valueOf() - left._latestEpisodeDate.valueOf(),
    );

  const tagIndex = buildTaxonomyIndex("tags", media);
  const speakerIndex = buildTaxonomyIndex("speakers", media);
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
    showsByRecentEpisode,
    latestEpisodeDateByShow,
    showsBySlug,
    podcastsBySlug,
    videosBySlug,
    resolvedPlaylists,
    stats,
  };
}

export function getTaxonomyPageData(
  index: ContentIndex,
  kind: TaxonomyKind,
  slug: string,
): TaxonomyPageData | null {
  const taxonomy = kind === "tags" ? index.tagIndex : index.speakerIndex;
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
  const playlist = index.resolvedPlaylists.find((entry) => entry.slug === slug);
  return playlist ? { playlist } : null;
}
