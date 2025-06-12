import {totalVideoAndPodcastEpisodes, videoCount,podcastCount, showCount, tagCount, speakerCount, draftCount, unsortedCount, underOneMinute } from "../../utils/mediaCollection";

export async function GET() {
  try {
    return new Response(
      JSON.stringify({
        stats: {
          totalMedia: totalVideoAndPodcastEpisodes,
          videos: videoCount,
          podcastShows: showCount,
          podcastEpisodes: podcastCount,
          tags: tagCount,
          speakers: speakerCount,
          underMinute: underOneMinute, // Add the backlog count to the stats
          drafts: draftCount, // Add the backlog count to the stats
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