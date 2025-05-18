import { allPostsFilteredAndSorted } from "../../utils/mediaCollection";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper function to extract YouTube ID from a URL
function extractYoutubeId(url) {
  if (!url) return null;
  
  try {
    // Handle both youtube.com and youtu.be URLs
    if (url.includes('youtube.com')) {
      // For standard YouTube URLs, get the v parameter
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v');
    } else if (url.includes('youtu.be')) {
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

export async function get() {
  try {
    // Get the directory name of the current module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Path to the ignore.json file
    const ignorePath = path.resolve(__dirname, '../../scripts/ignore.json');
    
    // Read the ignore.json file
    const ignoreData = fs.readFileSync(ignorePath, 'utf-8');
    const ignoredUrls = JSON.parse(ignoreData);
    
    // Extract YouTube IDs from ignored URLs
    const ignoredIds = ignoredUrls
      .map(url => extractYoutubeId(url))
      .filter(id => id !== null);
    
    // Extract YouTube IDs from media collection
    const collectionIds = allPostsFilteredAndSorted
      .filter(post => post.data.videoUrl)
      .map(post => {
        const id = extractYoutubeId(post.data.videoUrl);
        return {
          id
        };
      })
      .filter(item => item.id !== null);
    
    // Get a list of IDs that are in your collection but also in the ignore list
    const duplicateIds = collectionIds
      .filter(item => ignoredIds.includes(item.id))
      .map(item => ({
        id: item.id
      }));
    
    return {
      body: JSON.stringify({
        collection: collectionIds,
        ignored: ignoredIds,
        duplicates: duplicateIds,
        stats: {
          collectionCount: collectionIds.length,
          ignoredCount: ignoredIds.length,
          duplicateCount: duplicateIds.length
        }
      })
    };
  } catch (error) {
    console.error('Error processing video IDs:', error);
    
    return {
      status: 500,
      body: JSON.stringify({
        error: 'Failed to process video IDs',
        message: error.message
      })
    };
  }
}