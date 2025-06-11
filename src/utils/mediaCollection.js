import { getCollection } from "astro:content";
import { isDurationOneMinuteOrUnder } from "./isDurationOneMinuteOrUnder";

export const allVideos = await getCollection("media");
export const allShows = await getCollection("show");
export const allPodcasts = await getCollection("podcast");

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

export const postCount = allVideosFilteredAndSorted.length;
export const podcastCount = allPodcastsFilteredAndSorted.length;

export const postsWithTags = allMediaFilteredAndSorted.filter((post) => {
  return post.data.tags && post.data.tags.length > 0;
});

export const tags = [
  ...new Set(postsWithTags.flatMap((post) => post.data.tags)),
].sort();

export const postsWithSpeakers = allMediaFilteredAndSorted.filter((post) => {
  return post.data.speakers && post.data.speakers.length > 0;
});

export const speakers = [
  ...new Set(postsWithSpeakers.flatMap((post) => post.data.speakers)),
].sort();

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
