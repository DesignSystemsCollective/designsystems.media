import {allMediaFilteredAndSorted, allVideosFilteredAndSorted,allPodcasts, allShows, unsortedCount, underOneMinute, drafts, speakers, tags } from "../../utils/mediaCollection";

export async function GET() {
  try {
    const totalMedia = allMediaFilteredAndSorted.length;
    const totalVideos = allVideosFilteredAndSorted.length;
    const totalShows = allShows.length;
    const totalPodcasts = allPodcasts.length;
    const totalTagCount = tags.length;
    const totalSpeakerCount = speakers.length;
    const underOneMinute = underOneMinute.length;

    return new Response(
      JSON.stringify({
        stats: {
          totalMedia: totalMedia,
          videos: totalVideos,
          podcastShows: totalShows,
          podcastEpisodes: totalPodcasts,
          tags: totalTagCount,
          speakers: totalSpeakerCount,
          underMinute: underOneMinute, // Add the backlog count to the stats
          drafts: drafts.length, // Add the backlog count to the stats
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