import { allPostsFilteredAndSorted } from "../../utils/mediaCollection";

export async function get() {
  // Extract just the videoUrl from each post
  const videoUrls = allPostsFilteredAndSorted
    .filter(post => post.data.videoUrl) // Only include posts that have a videoUrl
    .map(post => post.data.videoUrl);
  
  return {
    body: JSON.stringify(videoUrls)
  };
}