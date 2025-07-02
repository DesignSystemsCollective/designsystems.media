// youtube.js
const he = require("he");
const { google } = require("googleapis");

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

// Also update the totalSeconds calculation in your existing code
function calculateTotalSeconds(rawDuration) {
  if (!rawDuration || typeof rawDuration !== 'string') {
    return 0;
  }

  // Handle special cases
  if (rawDuration === 'P0D' || rawDuration === 'PT0S' || rawDuration === 'PT') {
    return 0; // Treat as 0 seconds for filtering purposes
  }

  // Handle P[n]D format (days only)
  const daysMatch = rawDuration.match(/^P(\d+)D$/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    return days * 24 * 60 * 60; // Convert days to seconds
  }

  const hours = parseInt(rawDuration.match(/(\d+)H/)?.[1] || 0, 10);
  const minutes = parseInt(rawDuration.match(/(\d+)M/)?.[1] || 0, 10);
  const seconds = parseInt(rawDuration.match(/(\d+)S/)?.[1] || 0, 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Function to format video duration
function formatDuration(rawDuration) {
  // Safety check for null/undefined input
  if (!rawDuration || typeof rawDuration !== 'string') {
    console.warn('Invalid duration format:', rawDuration);
    return '0:00:00';
  }

  // Handle special cases
  if (rawDuration === 'P0D' || rawDuration === 'PT0S' || rawDuration === 'PT') {
    // This is likely a live stream, premiere, or video still processing
    console.log('Duration indicates live/processing video:', rawDuration);
    return '0:00:00';
  }

  // Handle P[n]D format (days only - rare but possible)
  if (rawDuration.match(/^P\d+D$/)) {
    console.log('Duration in days format, treating as long video:', rawDuration);
    return '24:00:00'; // Placeholder for very long content
  }

  // Extract hours, minutes, and seconds from the raw duration
  // More robust regex that handles edge cases
  const match = rawDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  // If no match, return default duration
  if (!match) {
    console.warn('Could not parse duration:', rawDuration);
    return '0:00:00';
  }

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
        // TODO: Think we can replace this with another call that uses less quota. We could pull the channels playlist IDs and then run those through the other function? https://developers.google.com/youtube/v3/docs/channels
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
            privacyStatus: "", // Initialize duration as an empty string
            duration: "", // Initialize duration as an empty string
          };

          // Retrieve the full video description
          const videoDetailsResponse = await youtube.videos.list({
            auth: API_KEY,
            id: videoId,
            part: "snippet,contentDetails,status", // Include contentDetails
          });

          const videoDetails = videoDetailsResponse.data.items[0].snippet;
          const contentDetails =
            videoDetailsResponse.data.items[0].contentDetails;
          const statusDetails = videoDetailsResponse.data.items[0].status;

          if (statusDetails && statusDetails.privacyStatus) {
            videoData.privacyStatus = statusDetails.privacyStatus;
          }

          if (videoDetails && videoDetails.description) {
            videoData.description = videoDetails.description;
          }

          if (contentDetails && contentDetails.duration) {
            // Extract and format the duration
            const rawDuration = contentDetails.duration;
            const formattedDuration = formatDuration(rawDuration);
            videoData.duration = formattedDuration;
            // Skip Shorts (videos 60 seconds or shorter)
            const totalSeconds = calculateTotalSeconds(rawDuration);
            if (totalSeconds <= 60) {
              continue; // Skip shorts
            }
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
        part: "snippet,contentDetails,status",
      });

      const videoItems = response.data.items;
      nextPageToken = response.data.nextPageToken;

      if (videoItems) {
        for (const item of videoItems) {
          const videoId = item.snippet.resourceId.videoId;

          // Check if the video ID has already been imported
          // TODO - 20 October. I wonder if this could be earlier somewhere, to reduce API calls?
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
            privacyStatus: item.status.privacyStatus, // Initialize duration as an empty string
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
            // Skip Shorts (videos 60 seconds or shorter)
            const totalSeconds = calculateTotalSeconds(rawDuration);
            if (totalSeconds <= 60) {
              continue; // Skip shorts
            }
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
