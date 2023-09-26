require("dotenv").config();
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");

// Initialize the YouTube Data API client
const youtube = google.youtube("v3");

// Set your API key or OAuth 2.0 credentials
const API_KEY = process.env.API_KEY;
const outputFilename = "data/output.json";
const outputMdFilename = "data/output.md";
const outputDir = "../src/content/media/";

// Load previously imported video data from output.json if it exists
let importedVideoData = [];

if (fs.existsSync(outputFilename)) {
  importedVideoData = JSON.parse(fs.readFileSync(outputFilename, "utf-8"));
}

// Import the sources from sources.json
const sourcesData = require("./sources.json");

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

// Function to retrieve all video data from a channel
async function getAllVideosFromChannel(channelId) {
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
            console.log(`Skipping video with ID ${videoId} (already imported)`);
            continue; // Skip this video and continue to the next one
          }

          const videoData = {
            title: item.snippet.title,
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
async function getAllVideosFromPlaylist(playlistId) {
  try {
    const videos = [];
    let nextPageToken = null;

    do {
      const response = await youtube.playlistItems.list({
        auth: API_KEY,
        playlistId: playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
        part: "snippet",
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
            console.log(`Skipping video with ID ${videoId} (already imported)`);
            continue; // Skip this video and continue to the next one
          }

          const videoData = {
            title: item.snippet.title,
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

// Function to generate an MDX file with video data
function generateMdxFile(video, folderPath) {
  const thumbnailUrl = video.thumbnails.high.url;

  const posterUrl = getPosterUrl(video.thumbnails);

  const videoTitle = video.title;
  const videoUrl = video.videoUrl;
  const videoDescription = video.description;

  // Define a function to remove special characters from a string
  function removeSpecialCharacters(str) {
    return str
      .replace(/[^\w\s-:"#]/g, "")
      .replace(/[\s-:"#]+/g, "-")
      .trim();
  }

  // Remove characters like :, ", and # from the title
  const sanitizedTitle = videoTitle.replace(/[:"#]/g, "");

  // Generate a folder name without special characters
  const folderName = removeSpecialCharacters(
    slugify(sanitizedTitle, { lower: true })
  )
    .split("-")
    .slice(0, 5)
    .join("-");

  // Define the file path for the index.mdx file
  const indexPath = path.join(folderPath, "index.mdx");

  // Create a folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Write the frontmatter and description to the index.mdx file
  fs.writeFileSync(
    indexPath,
    `---
title: "${videoTitle}"
publishedAt: "${video.publishedAt}"
image: "${thumbnailUrl}"
poster: "${posterUrl}"
videoUrl: "${videoUrl}"
localImages: false
tags: ["video"]
categories: ["unsorted"]
duration: "${video.duration}"
---
${videoDescription}\n`
  );

  console.log(`Created folder and index.mdx file for ${sanitizedTitle}`);
}

// Function to retrieve an appropriate poster URL
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

// Main function to retrieve data and generate output files
async function main() {
  try {
    console.log("Start: Gathering YouTube video data... 📹");

    const allVideos = [];

    for (const source of sourcesData) {
      if (source.type === "youtube-channel") {
        const channelUrl = source.url;
        const channelId = channelUrl.split("/").pop();
        console.log(`Fetching videos from channel ${channelId}...`);
        const channelVideos = await getAllVideosFromChannel(channelId);

        for (const video of channelVideos) {
          const sanitizedTitle = video.title.replace(
            /[:"“”#'‘’!?@_^%()]/gi,
            ""
          );
          const folderName = slugify(sanitizedTitle, { lower: true })
            .split("-")
            .slice(0, 5)
            .join("-");
          const folderPath = path.join(__dirname, outputDir, folderName);
          generateMdxFile(video, folderPath);
          allVideos.push(video);
        }
      } else if (source.type === "youtube-playlist") {
        const playlistUrl = source.url;
        const playlistId = playlistUrl.split("list=")[1];
        console.log(`Fetching videos from playlist ${playlistId}...`);
        const playlistVideos = await getAllVideosFromPlaylist(playlistId);

        for (const video of playlistVideos) {
          const sanitizedTitle = video.title.replace(/[:"#]/g, "");
          const folderName = slugify(sanitizedTitle, { lower: true })
            .split("-")
            .slice(0, 5)
            .join("-");
          const folderPath = path.join(__dirname, outputDir, folderName);
          generateMdxFile(video, folderPath);
          allVideos.push(video);
        }
      }
    }

    // Combine existing data with newly fetched data
    const combinedVideoData = [...importedVideoData, ...allVideos];

    // Calculate the number of videos added
    const videosAdded = allVideos.length;

    // Sort videos by publish date in descending order
    combinedVideoData.sort((a, b) => {
      const dateA = new Date(a.publishedAt);
      const dateB = new Date(b.publishedAt);
      return dateB - dateA;
    });

    // Write the combined video data to output.json
    fs.writeFileSync(
      outputFilename,
      JSON.stringify(combinedVideoData, null, 2)
    );

    // Calculate the new total of videos
    const newTotalVideos = combinedVideoData.length;

    console.log(`Video data written to ${outputFilename}`);
    console.log(`Videos added: ${videosAdded}`);
    console.log(`New total of videos: ${newTotalVideos}`);
    console.log("End: Gathering YouTube video data. ✅");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Call the main function to start retrieving data
main();
