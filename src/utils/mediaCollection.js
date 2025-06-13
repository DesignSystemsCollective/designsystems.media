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

export const allMediaFilteredAndSorted = [
  ...allVideos.filter(
    (post) =>
      !post.data.draft && !isDurationOneMinuteOrUnder(post.data.duration)
  ),
  ...allPodcasts,
].sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());


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

