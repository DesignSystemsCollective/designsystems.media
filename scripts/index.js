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

// Import the sources from sources.json
const sourcesData = require("./sources.json");

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
        part: "snippet", // Include snippet.publishedAt
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
            publishedAt: item.snippet.publishedAt, // Include publishedAt
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
        part: "snippet", // Include snippet.publishedAt
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
            publishedAt: item.snippet.publishedAt, // Include publishedAt
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

// Function to generate an MDX file with video data
function generateMdxFile(video, folderPath) {
  const thumbnailUrl = video.thumbnails.high.url;
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
title: >
  "${videoTitle}"
publishedAt: "${video.publishedAt}"
image: "${thumbnailUrl}"
videoUrl: "${videoUrl}"
---
${videoDescription}\n`
  );

  console.log(`Created folder and index.mdx file for ${sanitizedTitle}`);
}

// Main function to retrieve data and generate output files
async function main() {
  try {
    console.log("Start: Gathering youtube video data... 📹");

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

    // Sort videos by publish date in descending order
    allVideos.sort((a, b) => {
      const dateA = new Date(a.publishedAt);
      const dateB = new Date(b.publishedAt);
      return dateB - dateA;
    });

    // Process the combined video data as needed
    console.log(`Total videos retrieved: ${allVideos.length}`);

    // Write the combined video data to output.json
    fs.writeFileSync(outputFilename, JSON.stringify(allVideos, null, 2));
    console.log(`Video data written to ${outputFilename}`);

    // Generate the output.md file with video data
    const mdContent = generateMdxFile(allVideos);
    fs.writeFileSync(outputMdFilename, mdContent);
    console.log(`Markdown data written to ${outputMdFilename}`);

    console.log("End: Gathering youtube video data. ✅");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Call the main function to start retrieving data
main();
