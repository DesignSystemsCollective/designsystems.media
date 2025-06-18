import { getCollection } from "astro:content";
import { isDurationOneMinuteOrUnder } from "./isDurationOneMinuteOrUnder";

export const allVideos = await getCollection("media");
export const allShows = await getCollection("show");
export const allPodcasts = await getCollection("podcast");

// Total count, sorted
export const allMedia = [
  ...allVideos,
  ...allPodcasts,
].sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

// Filtered and sorted
export const allVideosFilteredAndSorted = allVideos
  .filter((post) => {
    return !post.data.draft && !isDurationOneMinuteOrUnder(post.data.duration);
  })
  .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

export const allPodcastsFilteredAndSorted = allPodcasts.sort(
  (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf()
);

export const allShowsFilteredAndSorted = allShows.sort(
  (a, b) => b.data.lastUpdate.localeCompare(a.data.lastUpdate)
);

export const allMediaFilteredAndSorted = [
  ...allVideos.filter(
    (post) =>
      !post.data.draft && !isDurationOneMinuteOrUnder(post.data.duration)
  ),
  ...allPodcasts,
].sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

// Sort shows by most recent episode

const showToLatestEpisodeDateMap = new Map();

for (const podcast of allPodcasts) {
  const showSlug = podcast.data.showSlug; // Assuming a 'showSlug' property links episode to show
  const publishedAt = new Date(podcast.data.publishedAt); // Convert to Date object for comparison

  if (!showToLatestEpisodeDateMap.has(showSlug)) {
    showToLatestEpisodeDateMap.set(showSlug, publishedAt);
  } else {
    const currentLatest = showToLatestEpisodeDateMap.get(showSlug);
    if (publishedAt > currentLatest) { // Compare Date objects directly
      showToLatestEpisodeDateMap.set(showSlug, publishedAt);
    }
  }
}

const allShowsWithLatestEpisodeDate = allShows.map(show => {
  const latestEpisodeDate = showToLatestEpisodeDateMap.get(show.slug);
  // If a show has no episodes, you might want to handle that (e.g., set a default old date or exclude it)
  // For now, we'll assume every show has at least one episode or default to a very old date if not found.
  return {
    ...show,
    _latestEpisodeDate: latestEpisodeDate || new Date(0), // Use Epoch start for shows without episodes, or handle as needed
  };
});

// Step 3: Sort the shows based on the _latestEpisodeDate
export const allShowsSortedByRecentEpisode = [...allShowsWithLatestEpisodeDate].sort(
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

export const tags = [
  ...new Set(postsWithTags.flatMap((post) => post.data.tags)),
].sort();

// Unsorted
export const unsorted = allMediaFilteredAndSorted.filter((post) =>
      post.data.tags && post.data.tags.includes("Unsorted")
    );

// Speakers
export const postsWithSpeakers = allMediaFilteredAndSorted.filter((post) => {
  return post.data.speakers && post.data.speakers.length > 0;
});

export const speakers = [
  ...new Set(postsWithSpeakers.flatMap((post) => post.data.speakers)),
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
export async function getEpisodesByShow(showSlug) {
  const episodes = await getCollection("podcast", ({ data }) => {
    return data.showSlug === showSlug && !data.draft;
  });

  return episodes.sort(
    (a, b) =>
      new Date(b.data.publishedAt).getTime() -
      new Date(a.data.publishedAt).getTime()
  );
}

export function getMostRecentEpisodeDateForShow(slug, allPodcastsFilteredAndSorted) {
  if (!slug || !allPodcastsFilteredAndSorted || allPodcastsFilteredAndSorted.length === 0) {
    return null;
  }

  // 1. Filter episodes to get only those belonging to the specified showSlug
  const showEpisodes = allPodcastsFilteredAndSorted.filter(
    (podcast) => podcast.data.showSlug === slug
  );

  // 2. Use the existing logic to find the most recent from the filtered list
  if (showEpisodes.length === 0) {
    return null; // No episodes found for this show
  }

  // Option A: Reuse your existing getMostRecentEpisodeDate (if it's also exported)
  // getMostRecentEpisodeDate(showEpisodes);

  // Option B: Inline the logic for finding the most recent within this function
  const sortedEpisodes = [...showEpisodes].sort((a, b) => {
    const dateA = new Date(a.data.publishedAt);
    const dateB = new Date(b.data.publishedAt);
    return dateB.valueOf() - dateA.valueOf();
  });

  return new Date(sortedEpisodes[0].data.publishedAt);
}

export async function getRecentEpisodes(limit = 10) {
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

export async function getShowBySlug(slug) {
  const shows = await getCollection("show", ({ slug: showSlug }) => {
    return showSlug === slug;
  });

  return shows[0] || null;
}

