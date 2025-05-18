import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    
    // Extract YouTube IDs from the URLs
    const youtubeIds = ignoredUrls.map(url => {
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
    }).filter(id => id !== null); // Remove any null values
    
    return {
      body: JSON.stringify(youtubeIds)
    };
  } catch (error) {
    console.error('Error reading ignore.json:', error);
    
    return {
      status: 500,
      body: JSON.stringify({
        error: 'Failed to process ignored videos list',
        message: error.message
      })
    };
  }
}