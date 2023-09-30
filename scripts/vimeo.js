// vimeo.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Set your Vimeo API access token
const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;

// Function to fetch video data from Vimeo
async function getVideoDataFromVimeo(videoId) {
  try {
    // Make a request to the Vimeo API to get video data
    const response = await axios.get(
      `https://api.vimeo.com/videos/${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
      }
    );

    const videoData = response.data;

    // Parse the video data and create frontmatter
    const frontmatter = {
      title: videoData.name,
      description: videoData.description || "",
      thumbnails: {
        // You may need to map Vimeo thumbnails to the same structure as YouTube
        high: {
          url: videoData.pictures.sizes[2].link,
        },
      },
      videoUrl: `https://vimeo.com/${videoId}`,
      publishedAt: videoData.created_time,
      duration: "", // You may need to calculate duration based on Vimeo data
    };

    return frontmatter;
  } catch (error) {
    console.error(
      `Error retrieving Vimeo video data for video ${videoId}:`,
      error.message
    );
    return null;
  }
}

module.exports = {
  getVideoDataFromVimeo,
};
