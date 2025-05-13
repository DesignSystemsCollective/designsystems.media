import { getCollection } from "astro:content";
import { isDurationOneMinuteOrUnder } from "./isDurationOneMinuteOrUnder";

export const allPosts = await getCollection("media");

export const allPostsFilteredAndSorted = allPosts
  .filter((post) => {
    return !post.data.draft && !isDurationOneMinuteOrUnder(post.data.duration);
  })
  .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());

export const postCount = allPostsFilteredAndSorted.length;

export const postsWithTags = allPostsFilteredAndSorted.filter((post) => {
  return post.data.tags && post.data.tags.length > 0;
});

export const tags = [
  ...new Set(postsWithTags.flatMap((post) => post.data.tags)),
].sort();

export const postsWithSpeakers = allPostsFilteredAndSorted.filter((post) => {
  return post.data.speakers && post.data.speakers.length > 0;
});

export const speakers = [
  ...new Set(postsWithSpeakers.flatMap((post) => post.data.speakers)),
].sort();
