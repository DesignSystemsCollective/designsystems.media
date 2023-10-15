// youtube.js
const he = require("he");
const { google } = require("googleapis");
const fs = require("fs");

// Initialize the YouTube Data API client
const youtube = google.youtube("v3");

// Set your YouTube API key or OAuth 2.0 credentials
const API_KEY = process.env.API_KEY;

// Function to replace plain quotes with fancy quotes
function replaceQuotesWithFancyQuotes(title) {
  // Replace straight quotes with fancy quotes
  const fancyTitle = title.replace(/"/g, "“").replace(/"/g, "”");
  return fancyTitle;
}

// Function to format video duration
function formatDuration(rawDuration) {
  // Extract hours, minutes, and seconds from the raw duration
  const match = rawDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  // Format the duration as "HH:MM:SS"
  const formattedDuration = `${hours}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;

  return formattedDuration;
}

// Function to retrieve an appropriate poster URL (YouTube-specific)
function getPosterUrl(thumbnails) {
  // Check if maxres thumbnail is available, otherwise use high thumbnail
  if (thumbnails.maxres && thumbnails.maxres.url) {
    return thumbnails.maxres.url;
  } else if (thumbnails.high && thumbnails.high.url) {
    // Manually construct maxres URL from high URL
    const highUrl = thumbnails.high.url;
    return highUrl.replace("hqdefault.jpg", "maxresdefault.jpg");
  } else {
    // If no suitable thumbnail is found, return an empty string
    return "";
  }
}

// Function to retrieve all video data from a channel
async function getAllVideosFromChannel(channelId, importedVideoData) {
  try {
    const videos = [];
    let nextPageToken = null;

    do {
      const response = await youtube.search.list({
        auth: API_KEY,
        channelId: channelId,
        maxResults: 50,
        pageToken: nextPageToken,
        order: "date",
        part: "snippet",
        type: "video",
      });

      const videoItems = response.data.items;
      nextPageToken = response.data.nextPageToken;

      if (videoItems) {
        for (const item of videoItems) {
          const videoId = item.id.videoId;

          // Check if the video ID has already been imported
          if (
            importedVideoData.some((video) => video.videoUrl.includes(videoId))
          ) {
            // console.log(`Skipping video with ID ${videoId} (already imported)`);
            continue; // Skip this video and continue to the next one
          }

          const videoData = {
            title: replaceQuotesWithFancyQuotes(he.decode(item.snippet.title)),
            description: "", // Initialize description as an empty string
            thumbnails: item.snippet.thumbnails,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: item.snippet.publishedAt,
            duration: "", // Initialize duration as an empty string
          };

          // Retrieve the full video description
          const videoDetailsResponse = await youtube.videos.list({
            auth: API_KEY,
            id: videoId,
            part: "snippet,contentDetails", // Include contentDetails
          });

          const videoDetails = videoDetailsResponse.data.items[0].snippet;
          const contentDetails =
            videoDetailsResponse.data.items[0].contentDetails;

          if (videoDetails && videoDetails.description) {
            videoData.description = videoDetails.description;
          }

          if (contentDetails && contentDetails.duration) {
            // Extract and format the duration
            const rawDuration = contentDetails.duration;
            const formattedDuration = formatDuration(rawDuration);
            videoData.duration = formattedDuration;
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

// Function to retrieve all video data from a playlist
async function getAllVideosFromPlaylist(playlistId, importedVideoData) {
  try {
    const videos = [];
    let nextPageToken = null;

    do {
      const response = await youtube.playlistItems.list({
        auth: API_KEY,
        playlistId: playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
        part: "snippet,contentDetails",
      });

      const videoItems = response.data.items;
      nextPageToken = response.data.nextPageToken;

      if (videoItems) {
        for (const item of videoItems) {
          const videoId = item.snippet.resourceId.videoId;

          // Check if the video ID has already been imported
          if (
            importedVideoData.some((video) => video.videoUrl.includes(videoId))
          ) {
            //console.log(`Skipping video with ID ${videoId} (already imported)`);
            continue; // Skip this video and continue to the next one
          }

          const videoData = {
            title: replaceQuotesWithFancyQuotes(he.decode(item.snippet.title)),
            description: "", // Initialize description as an empty string
            thumbnails: item.snippet.thumbnails,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: item.contentDetails.videoPublishedAt,
            duration: "", // Initialize duration as an empty string
          };

          // Retrieve the full video description
          const videoDetailsResponse = await youtube.videos.list({
            auth: API_KEY,
            id: videoId,
            part: "snippet,contentDetails",
          });

          const videoDetails = videoDetailsResponse.data.items[0].snippet;
          const contentDetails =
            videoDetailsResponse.data.items[0].contentDetails;

          if (videoDetails && videoDetails.description) {
            videoData.description = videoDetails.description;
          }
          if (contentDetails && contentDetails.duration) {
            // Extract and format the duration
            const rawDuration = contentDetails.duration;
            const formattedDuration = formatDuration(rawDuration);
            videoData.duration = formattedDuration;
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

module.exports = {
  getAllVideosFromChannel,
  getAllVideosFromPlaylist,
  getPosterUrl,
};
