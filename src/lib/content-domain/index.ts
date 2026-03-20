import { loadCollections } from "./loaders.ts";
import {
  buildContentIndex,
  getPlaylistPageData,
  getShowPageData,
  getTaxonomyPageData,
} from "./selectors.ts";
import type {
  ContentIndex,
  MediaEntry,
  MediaLikeEntry,
  PlaylistPageData,
  PodcastEntry,
  ResolvedPlaylist,
  ShowEntry,
  ShowPageData,
  ShowWithLatestEpisode,
  SiteStats,
  TaxonomyIndex,
  TaxonomyKind,
  TaxonomyPageData,
} from "./types.ts";

let contentIndexPromise: Promise<ContentIndex> | undefined;

async function getContentIndex(): Promise<ContentIndex> {
  if (!contentIndexPromise) {
    contentIndexPromise = loadCollections().then((collections) =>
      buildContentIndex(collections),
    );
  }

  return contentIndexPromise;
}

export async function getAllMedia(): Promise<MediaLikeEntry[]> {
  return (await getContentIndex()).media;
}

export async function getVideoEntries(): Promise<MediaEntry[]> {
  return (await getContentIndex()).videos;
}

export async function getPodcastEntries(): Promise<PodcastEntry[]> {
  return (await getContentIndex()).podcasts;
}

export async function getShowEntries(): Promise<ShowEntry[]> {
  return (await getContentIndex()).shows;
}

export async function getPlaylistEntries(): Promise<ResolvedPlaylist[]> {
  return (await getContentIndex()).resolvedPlaylists;
}

export async function getRecentVideos(limit = 10): Promise<MediaEntry[]> {
  return (await getVideoEntries()).slice(0, limit);
}

export async function getRecentPodcasts(limit = 10): Promise<PodcastEntry[]> {
  return (await getPodcastEntries()).slice(0, limit);
}

export async function getRecentShows(limit = 10): Promise<ShowWithLatestEpisode[]> {
  return (await getContentIndex()).showsByRecentEpisode.slice(0, limit);
}

export async function getShowsSortedByRecentEpisode(): Promise<ShowWithLatestEpisode[]> {
  return (await getContentIndex()).showsByRecentEpisode;
}

export async function getMostRecentEpisodeDateForShow(
  slug: string | undefined,
): Promise<Date | null> {
  if (!slug) {
    return null;
  }

  return (await getContentIndex()).latestEpisodeDateByShow.get(slug) ?? null;
}

export async function getSiteStats(): Promise<SiteStats> {
  return (await getContentIndex()).stats;
}

export async function getTaxonomyIndex(kind: TaxonomyKind): Promise<TaxonomyIndex> {
  const index = await getContentIndex();
  return kind === "tags" ? index.tagIndex : index.speakerIndex;
}

export async function getTaxonomyPage(
  kind: TaxonomyKind,
  slug: string,
): Promise<TaxonomyPageData | null> {
  return getTaxonomyPageData(await getContentIndex(), kind, slug);
}

export async function getMediaByTag(slug: string): Promise<MediaLikeEntry[]> {
  return (await getTaxonomyPage("tags", slug))?.posts ?? [];
}

export async function getMediaBySpeaker(slug: string): Promise<MediaLikeEntry[]> {
  return (await getTaxonomyPage("speakers", slug))?.posts ?? [];
}

export async function getShowPage(slug: string): Promise<ShowPageData | null> {
  return getShowPageData(await getContentIndex(), slug);
}

export async function getPlaylistPage(slug: string): Promise<PlaylistPageData | null> {
  return getPlaylistPageData(await getContentIndex(), slug);
}

export async function getVideoBySlug(slug: string): Promise<MediaEntry | null> {
  return (await getContentIndex()).videosBySlug.get(slug) ?? null;
}

export async function getPodcastBySlug(slug: string): Promise<PodcastEntry | null> {
  const podcast = (await getContentIndex()).podcastsBySlug.get(slug) ?? null;
  if (!podcast || podcast.data.draft) {
    return null;
  }

  return podcast;
}

export async function getShowBySlug(slug: string): Promise<ShowEntry | null> {
  const show = (await getContentIndex()).showsBySlug.get(slug) ?? null;
  if (!show || show.data.draft) {
    return null;
  }

  return show;
}
