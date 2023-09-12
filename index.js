const { google } = require("googleapis");
const fs = require("fs");

// Initialize the YouTube Data API client
const youtube = google.youtube("v3");

// Set your API key or OAuth 2.0 credentials
const API_KEY = "YOUR_API_KEY"; // Replace with your API key

// Set the playlist ID and channel ID
const PLAYLIST_ID = "YOUR_PLAYLIST_ID"; // Replace with the playlist ID
const CHANNEL_ID = "YOUR_CHANNEL_ID"; // Replace with the channel ID

// Function to retrieve all video data from a playlist
async function getAllVideosFromPlaylist() {
  try {
    const videos = [];
    let nextPageToken = null;

    do {
      const response = await youtube.playlistItems.list({
        auth: API_KEY,
        playlistId: PLAYLIST_ID,
        maxResults: 50, // Adjust the number of results per page as needed
        pageToken: nextPageToken,
        part: "snippet",
      });

      const videoItems = response.data.items;
      nextPageToken = response.data.nextPageToken;

      if (videoItems) {
        videos.push(...videoItems);
      }
    } while (nextPageToken);

    return videos;
  } catch (error) {
    console.error("Error retrieving playlist videos:", error.message);
    return [];
  }
}

// Function to retrieve all video data from a channel
async function getAllVideosFromChannel() {
  try {
    const videos = [];
    let nextPageToken = null;

    do {
      const response = await youtube.search.list({
        auth: API_KEY,
        channelId: CHANNEL_ID,
        maxResults: 50, // Adjust the number of results per page as needed
        pageToken: nextPageToken,
        order: "date", // You can change the order if needed (e.g., 'viewCount', 'relevance')
        part: "snippet",
        type: "video",
      });

      const videoItems = response.data.items;
      nextPageToken = response.data.nextPageToken;

      if (videoItems) {
        videos.push(...videoItems);
      }
    } while (nextPageToken);

    return videos;
  } catch (error) {
    console.error("Error retrieving channel videos:", error.message);
    return [];
  }
}

// Main function to retrieve data from both playlist and channel
async function main() {
  const playlistVideos = await getAllVideosFromPlaylist();
  const channelVideos = await getAllVideosFromChannel();

  // Combine and process the video data as needed
  const allVideos = [...playlistVideos, ...channelVideos];

  // Process the video data or save it to a file as needed
  console.log(`Total videos retrieved: ${allVideos.length}`);
  fs.writeFileSync("combined_videos.json", JSON.stringify(allVideos, null, 2));
}

console.log("Gathering youtube video data... 📹");

// Call the main function to start retrieving data
// main();
