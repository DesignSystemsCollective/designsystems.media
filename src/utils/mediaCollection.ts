import {
  getAllMedia,
  getMostRecentEpisodeDateForShow as getMostRecentEpisodeDateForShowFromDomain,
  getPodcastEntries,
  getRecentPodcasts,
  getShowBySlug as getShowBySlugFromDomain,
  getShowEntries,
  getShowsSortedByRecentEpisode,
  getSiteStats,
  getTaxonomyIndex,
  getVideoEntries,
} from "../lib/content-domain";
import { normalizeLabel } from "../lib/content-domain/normalizers";
import type { PodcastEntry, ShowEntry } from "../types/media";

export const allVideos = await getVideoEntries();
export const allShows = await getShowEntries();
export const allPodcasts = await getPodcastEntries();
export const allMedia = await getAllMedia();

export const allVideosFilteredAndSorted = allVideos;
export const allPodcastsFilteredAndSorted = allPodcasts;
export const allShowsFilteredAndSorted = allShows;
export const allMediaFilteredAndSorted = allMedia;
export const allShowsSortedByRecentEpisode = await getShowsSortedByRecentEpisode();

const [tagIndex, speakerIndex, stats] = await Promise.all([
  getTaxonomyIndex("tags"),
  getTaxonomyIndex("speakers"),
  getSiteStats(),
]);

export const normalizeTag = normalizeLabel;
export const tags = tagIndex.items.map((item) => item.name);
export const speakers = speakerIndex.items.map((item) => item.name);
export const unsorted = await getAllMedia().then((items) =>
  items.filter((item) => normalizeLabel(item.data.tags?.[0] ?? "") === "Unsorted"),
);
export const drafts = [];
export const underOneMinute = [];

export const totalVideoAndPodcastEpisodes = stats.totalMedia;
export const videoCount = stats.videos;
export const podcastCount = stats.podcastEpisodes;
export const showCount = stats.podcastShows;
export const tagCount = stats.tags;
export const speakerCount = stats.speakers;
export const unsortedCount = stats.unsortedTag;
export const draftCount = stats.drafts;

export async function getEpisodesByShow(showSlug: string): Promise<PodcastEntry[]> {
  const podcasts = await getPodcastEntries();
  return podcasts.filter((podcast) => podcast.data.showSlug === showSlug);
}

export async function getMostRecentEpisodeDateForShow(
  slug: string,
  _allPodcastsFilteredAndSorted?: PodcastEntry[],
): Promise<Date | null> {
  return getMostRecentEpisodeDateForShowFromDomain(slug);
}

export async function getRecentEpisodes(limit = 10): Promise<PodcastEntry[]> {
  return getRecentPodcasts(limit);
}

export async function getShowBySlug(slug: string): Promise<ShowEntry | null> {
  return getShowBySlugFromDomain(slug);
}
