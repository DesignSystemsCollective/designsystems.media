import { allPostsFilteredAndSorted } from "../../utils/mediaCollection";
import { speakers, tags } from "../../utils/mediaCollection";

export async function GET() {
  try {
    const totalPosts = allPostsFilteredAndSorted.length;
    const totalTagCount = tags.length;
    const totalSpeakerCount = speakers.length;

    return {
      body: JSON.stringify({
        stats: {
          totalPosts: totalPosts,
          totalTags: totalTagCount,
          totalSpeakers: totalSpeakerCount,
        },
      }),
    };
  } catch (error) {
    console.error("Error generating library stats:", error);

    return {
      status: 500,
      body: JSON.stringify({
        error: "Failed to generate library stats",
        message: error.message,
      }),
    };
  }
}