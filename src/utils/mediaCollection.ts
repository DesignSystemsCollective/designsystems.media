import { getCollection, type CollectionEntry } from "astro:content";
import { isDurationOneMinuteOrUnder } from "./isDurationOneMinuteOrUnder";
import type { ShowEntry, PodcastEntry, MediaEntry } from "../types/media";

export const allVideos = await getCollection("media");
export const allShows = await getCollection("show");
export const allPodcasts = await getCollection("podcast");

// Total count, sorted
export const allMedia: (MediaEntry | PodcastEntry)[] = [
  ...allVideos,
  ...allPodcasts,
].sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

// Filtered and sorted
export const allVideosFilteredAndSorted: MediaEntry[] = allVideos
  .filter((post) => {
    return !post.data.draft && !isDurationOneMinuteOrUnder(post.data.duration);
  })
  .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

export const allPodcastsFilteredAndSorted: PodcastEntry[] = allPodcasts.sort(
  (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf()
);

export const allShowsFilteredAndSorted: ShowEntry[] = allShows.sort(
  (a, b) => b.data.lastUpdate.localeCompare(a.data.lastUpdate)
);

export const allMediaFilteredAndSorted: (MediaEntry | PodcastEntry)[] = [
  ...allVideos.filter(
    (post) =>
      !post.data.draft && !isDurationOneMinuteOrUnder(post.data.duration)
  ),
  ...allPodcasts,
].sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

// Sort shows by most recent episode

const showToLatestEpisodeDateMap = new Map<string, Date>();

for (const podcast of allPodcasts) {
  const showSlug = podcast.data.showSlug;
  const publishedAt = new Date(podcast.data.publishedAt);

  if (!showToLatestEpisodeDateMap.has(showSlug)) {
    showToLatestEpisodeDateMap.set(showSlug, publishedAt);
  } else {
    const currentLatest = showToLatestEpisodeDateMap.get(showSlug);
    if (currentLatest && publishedAt > currentLatest) {
      showToLatestEpisodeDateMap.set(showSlug, publishedAt);
    }
  }
}

interface ShowWithLatestEpisode extends ShowEntry {
  _latestEpisodeDate: Date;
}

const allShowsWithLatestEpisodeDate: ShowWithLatestEpisode[] = allShows.map(show => {
  const latestEpisodeDate = showToLatestEpisodeDateMap.get(show.slug);
  return {
    ...show,
    _latestEpisodeDate: latestEpisodeDate || new Date(0),
  };
});

export const allShowsSortedByRecentEpisode: ShowWithLatestEpisode[] = [...allShowsWithLatestEpisodeDate].sort(
  (a, b) => b._latestEpisodeDate.valueOf() - a._latestEpisodeDate.valueOf()
);

// Drafts
export const drafts = await getCollection('media', ({ data }) => {
    return data.draft !== false;
});

// Short content
export const underOneMinute = allMedia
  .filter((post) => {
    return isDurationOneMinuteOrUnder(post.data.duration);
  });

// Tags
export const postsWithTags = allMediaFilteredAndSorted.filter((post) => {
  return post.data.tags && post.data.tags.length > 0;
});

// Normalize tags - capitalize first letter of each word
export const normalizeTag = (tag: string): string => {
  return tag
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const tags: string[] = [
  ...new Set(postsWithTags.flatMap((post) => (post.data.tags || []).map(normalizeTag))),
].sort();

// Unsorted
export const unsorted = allMediaFilteredAndSorted.filter((post) =>
      post.data.tags && post.data.tags.includes("Unsorted")
    );

// Speakers
export const postsWithSpeakers = allMediaFilteredAndSorted.filter((post) => {
  return post.data.speakers && post.data.speakers.length > 0;
});

export const speakers: string[] = [
  ...new Set(postsWithSpeakers.flatMap((post) => (post.data.speakers || []).map(normalizeTag))),
].sort();

// Counts
export const totalVideoAndPodcastEpisodes = allMediaFilteredAndSorted.length;
export const videoCount = allVideosFilteredAndSorted.length;
export const podcastCount = allPodcastsFilteredAndSorted.length;
export const showCount = allShows.length;
export const tagCount = tags.length;
export const speakerCount = speakers.length;
export const unsortedCount = unsorted.length;
export const draftCount = drafts.length;

// Functions 
export async function getEpisodesByShow(showSlug: string): Promise<PodcastEntry[]> {
  const episodes = await getCollection("podcast", ({ data }) => {
    return data.showSlug === showSlug && !data.draft;
  });

  return episodes.sort(
    (a, b) =>
      new Date(b.data.publishedAt).getTime() -
      new Date(a.data.publishedAt).getTime()
  );
}

export function getMostRecentEpisodeDateForShow(
  slug: string, 
  allPodcastsFilteredAndSorted: PodcastEntry[]
): Date | null {
  if (!slug || !allPodcastsFilteredAndSorted || allPodcastsFilteredAndSorted.length === 0) {
    return null;
  }

  const showEpisodes = allPodcastsFilteredAndSorted.filter(
    (podcast) => podcast.data.showSlug === slug
  );

  if (showEpisodes.length === 0) {
    return null;
  }

  const sortedEpisodes = [...showEpisodes].sort((a, b) => {
    const dateA = new Date(a.data.publishedAt);
    const dateB = new Date(b.data.publishedAt);
    return dateB.valueOf() - dateA.valueOf();
  });

  return new Date(sortedEpisodes[0].data.publishedAt);
}

export async function getRecentEpisodes(limit = 10): Promise<PodcastEntry[]> {
  const episodes = await getCollection("podcast", ({ data }) => {
    return !data.draft;
  });

  return episodes
    .sort(
      (a, b) =>
        new Date(b.data.publishedAt).getTime() -
        new Date(a.data.publishedAt).getTime()
    )
    .slice(0, limit);
}

export async function getShowBySlug(slug: string): Promise<ShowEntry | null> {
  const shows = await getCollection("show", ({ slug: showSlug }) => {
    return showSlug === slug;
  });

  return shows[0] || null;
}
