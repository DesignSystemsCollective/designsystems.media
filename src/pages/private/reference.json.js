import ignoreData from "../../../scripts/ignore.json";
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
    const ignoredUrls = JSON.parse(ignoreData);

    // Extract YouTube IDs from ignored URLs
    const ignoredIds = ignoredUrls
      .map((url) => extractYoutubeId(url))
      .filter((id) => id !== null);

    // Extract YouTube IDs from media collection
    const collectionIds = allPostsFilteredAndSorted
      .filter((post) => post.data.videoUrl)
      .map((post) => {
        const id = extractYoutubeId(post.data.videoUrl);
        return {
          id,
        };
      })
      .filter((item) => item.id !== null);

    // Get a list of IDs that are in your collection but also in the ignore list
    const duplicateIds = collectionIds
      .filter((item) => ignoredIds.includes(item.id))
      .map((item) => ({
        id: item.id,
      }));

    return new Response(
      JSON.stringify({
        collection: collectionIds,
        ignored: ignoredIds,
        duplicates: duplicateIds,
        stats: {
          collectionCount: collectionIds.length,
          ignoredCount: ignoredIds.length,
          duplicateCount: duplicateIds.length,
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
    console.error("Error processing video IDs:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process video IDs",
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