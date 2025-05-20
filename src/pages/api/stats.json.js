import { allPostsFilteredAndSorted } from "../../utils/mediaCollection";
import { speakers, tags } from "../../utils/mediaCollection";

export async function GET() {
  try {
    const totalPosts = allPostsFilteredAndSorted.length;
    const totalTagCount = tags.length;
    const totalSpeakerCount = speakers.length;

    // Filter the posts, accessing the 'draft' property within the 'frontmatter'
    const backlogCount = allPostsFilteredAndSorted.filter(
      (post) => post.frontmatter?.draft === true
    ).length;

    return new Response(
      JSON.stringify({
        stats: {
          totalPosts: totalPosts,
          totalTags: totalTagCount,
          totalSpeakers: totalSpeakerCount,
          backlog: backlogCount, // Add the backlog count to the stats
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