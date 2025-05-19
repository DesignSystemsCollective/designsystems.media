import ignoreData from "../../../video-aggregator/data/ignoreID.json";
import { allPostsFilteredAndSorted } from "../../utils/mediaCollection";

// Helper function to extract YouTube ID from a URL
function extractYoutubeId(url) {
  if (!url) return null;

  try {
    // Handle both youtube.com and youtu.be URLs
    if (url.includes("youtube.com")) {
      // For standard YouTube URLs, get the v parameter
      const urlObj = new URL(url);
      return urlObj.searchParams.get("v");
    } else if (url.includes("youtu.be")) {
      // For shortened youtu.be URLs, get the path without the leading slash
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1);
    }
    return null;
  } catch (e) {
    console.error(`Failed to parse URL: ${url}`, e);
    return null;
  }
}

export async function GET() {
  try {
    // Now ignoreData should directly be an array of IDs
    const ignoredIds = ignoreData;

    // Extract YouTube IDs from media collection and directly get the IDs
    const collectionIds = allPostsFilteredAndSorted
      .filter((post) => post.data.videoUrl)
      .map((post) => extractYoutubeId(post.data.videoUrl))
      .filter((id) => id !== null);

    // Get a list of IDs that are in your collection but also in the ignore list
    const duplicateIds = collectionIds.filter((id) => ignoredIds.includes(id));

    return new Response(
      JSON.stringify({
        stats: {
          collectionCount: collectionIds.length,
          ignoredCount: ignoredIds.length,
          duplicateCount: duplicateIds.length,
        },
        collection: collectionIds,
        ignored: ignoredIds,
        duplicates: duplicateIds.map((id) => ({ id })), // Keep duplicates as objects for consistency
        
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing video IDs:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process video IDs",
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
