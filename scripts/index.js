require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");

// Initialize the YouTube Data API client
const youtube = google.youtube("v3");

// Set your API key or OAuth 2.0 credentials
const API_KEY = process.env.API_KEY; // Replace with your API key

// Import the sources from sources.json
const sourcesData = require("./sources.json");
const outputFilename = "data/output.json";
const outputMdFilename = "data/output.md";

// Function to retrieve all video data from a playlist
async function getAllVideosFromPlaylist(playlistId) {
  try {
    const videos = [];
    let nextPageToken = null;

    do {
      const response = await youtube.playlistItems.list({
        auth: API_KEY,
        playlistId: playlistId,
        maxResults: 50, // Adjust the number of results per page as needed
        pageToken: nextPageToken,
        part: "snippet",
      });

      const videoItems = response.data.items;
      nextPageToken = response.data.nextPageToken;

      if (videoItems) {
        for (const item of videoItems) {
          const videoData = {
            title: item.snippet.title,
            description: "", // Initialize description as an empty string
            thumbnails: item.snippet.thumbnails,
            videoUrl: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
          };

          // Retrieve the full video description
          const videoDetailsResponse = await youtube.videos.list({
            auth: API_KEY,
            id: item.snippet.resourceId.videoId,
            part: "snippet",
          });

          const videoDetails = videoDetailsResponse.data.items[0].snippet;
          if (videoDetails && videoDetails.description) {
            videoData.description = videoDetails.description;
          }

          videos.push(videoData);
        }
      }
    } while (nextPageToken);

    return videos;
  } catch (error) {
    console.error(
      `Error retrieving playlist videos for playlist ${playlistId}:`,
      error.message
    );
    return [];
  }
}

// Function to retrieve all video data from a channel
async function getAllVideosFromChannel(channelId) {
  try {
    const videos = [];
    let nextPageToken = null;

    do {
      const response = await youtube.search.list({
        auth: API_KEY,
        channelId: channelId,
        maxResults: 50, // Adjust the number of results per page as needed
        pageToken: nextPageToken,
        order: "date", // You can change the order if needed (e.g., 'viewCount', 'relevance')
        part: "snippet",
        type: "video",
      });

      const videoItems = response.data.items;
      nextPageToken = response.data.nextPageToken;

      if (videoItems) {
        for (const item of videoItems) {
          const videoData = {
            title: item.snippet.title,
            description: "", // Initialize description as an empty string
            thumbnails: item.snippet.thumbnails,
            videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          };

          // Retrieve the full video description
          const videoDetailsResponse = await youtube.videos.list({
            auth: API_KEY,
            id: item.id.videoId,
            part: "snippet",
          });

          const videoDetails = videoDetailsResponse.data.items[0].snippet;
          if (videoDetails && videoDetails.description) {
            videoData.description = videoDetails.description;
          }

          videos.push(videoData);
        }
      }
    } while (nextPageToken);

    return videos;
  } catch (error) {
    console.error(
      `Error retrieving channel videos for channel ${channelId}:`,
      error.message
    );
    return [];
  }
}

// Function to generate an MD file with video data
function generateMdFile(videos) {
  let mdContent = "";

  videos.forEach((video, index) => {
    const thumbnailUrl = video.thumbnails.high.url;
    const videoTitle = video.title;
    const videoUrl = video.videoUrl;
    const videoDescription = video.description;

    mdContent += `![Thumbnail](${thumbnailUrl})\n\n`;
    mdContent += `## [${videoTitle}](${videoUrl})\n\n`;
    mdContent += `${videoDescription}\n\n---\n\n`;
  });

  return mdContent;
}

// Main function to retrieve data and generate output files
async function main() {
  try {
    const allVideos = [];

    for (const source of sourcesData) {
      if (source.type === "youtube-channel") {
        const channelUrl = source.url;
        const channelId = channelUrl.split("/").pop(); // Extract channel ID from URL
        const channelVideos = await getAllVideosFromChannel(channelId);
        allVideos.push(...channelVideos);
      } else if (source.type === "youtube-playlist") {
        const playlistUrl = source.url;
        const playlistId = playlistUrl.split("list=")[1]; // Extract playlist ID from URL
        const playlistVideos = await getAllVideosFromPlaylist(playlistId);
        allVideos.push(...playlistVideos);
      }
    }

    // Process the combined video data as needed
    console.log(`Total videos retrieved: ${allVideos.length}`);

    // Write the combined video data to output.json
    fs.writeFileSync(outputFilename, JSON.stringify(allVideos, null, 2));
    console.log(`Video data written to ${outputFilename}`);

    // Generate the output.md file with video data
    const mdContent = generateMdFile(allVideos);
    fs.writeFileSync(outputMdFilename, mdContent);
    console.log(`Markdown data written to ${outputMdFilename}`);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

console.log("Gathering youtube video data... 📹");

// Call the main function to start retrieving data
main();
