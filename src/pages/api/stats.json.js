import { getCollection } from "astro:content";
import { allPostsFilteredAndSorted, speakers, tags } from "../../utils/mediaCollection";
import { isDurationOneMinuteOrUnder } from "../../utils/isDurationOneMinuteOrUnder";

export async function GET() {
  try {
    const totalPosts = allPostsFilteredAndSorted.length;
    const totalTagCount = tags.length;
    const totalSpeakerCount = speakers.length;
    const allPosts = await getCollection("media");

const backlogCount = await getCollection('media', ({ data }) => {
  return data.draft !== false;
});

  const unsortedCount = allPosts.filter((post) =>
      post.data.tags && post.data.tags.includes("Unsorted")
    ).length;

 const underOneMinute = allPosts
  .filter((post) => {
    return isDurationOneMinuteOrUnder(post.data.duration);
  }).length;

    return new Response(
      JSON.stringify({
        stats: {
          totalPosts: totalPosts,
          totalTags: totalTagCount,
          totalSpeakers: totalSpeakerCount,
          underMinute: underOneMinute, // Add the backlog count to the stats
          backlog: backlogCount.length, // Add the backlog count to the stats
          unsortedTag: unsortedCount, // Add the unsorted count to the stats
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error generating library stats:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to generate library stats",
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}