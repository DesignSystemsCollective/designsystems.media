require("dotenv").config();
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const { getAllVideosFromChannel, getAllVideosFromPlaylist } = require("./youtube");
const { getAllVideosFromVimeo } = require("./vimeo");

// Constants
const DATA_DIR = path.join(__dirname, "../data");
const OUTPUT_DIR = path.join(__dirname, "../../src/content/media/");
const SOURCES_FILE = path.join(DATA_DIR, "sources.json");
const IGNORE_FILE = path.join(DATA_DIR, "ignore.json");
const OUTPUT_FILE = path.join(DATA_DIR, "output.json");

const SLUGIFY_OPTIONS = {
  lower: true,
  remove: /[*+~.()'"!:@,;\[\]]/g
};

// Utility functions
const loadJsonFile = (filePath) => {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : [];
};

const getCurrentDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const sanitizeTitle = (title) => title.replace(/[:"""#'''!?@_^%()]/gi, "");

const createFolderName = (title) => {
  const sanitized = sanitizeTitle(title);
  return slugify(sanitized, SLUGIFY_OPTIONS)
    .split("-")
    .slice(0, 7)
    .join("-");
};

const getPosterUrl = (thumbnails) => {
  if (thumbnails.maxres?.url) {
    return thumbnails.maxres.url;
  }
  if (thumbnails.high?.url) {
    return thumbnails.high.url.replace("hqdefault.jpg", "maxresdefault.jpg");
  }
  return "";
};

const generateMdxFile = (video, folderPath) => {
  const indexPath = path.join(folderPath, "index.mdx");
  
  // Skip if file already exists
  if (fs.existsSync(indexPath)) {
    return;
  }

  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const frontmatter = `---
title: "${video.title}"
publishedAt: "${video.publishedAt}"
image: "${video.thumbnails.high.url}"
dateAdded: "${getCurrentDate()}"
poster: "${getPosterUrl(video.thumbnails)}"
videoUrl: "${video.videoUrl}"
localImages: false
tags: ["Unsorted"]
categories: ["Video"]
duration: "${video.duration}"
privacyStatus: "${video.privacyStatus}"
draft: true
speakers: ["Unsorted"]
---
${video.description}
`;

  fs.writeFileSync(indexPath, frontmatter);
  console.log(`Created: ${sanitizeTitle(video.title)}`);
};

// Video processing handlers
const videoHandlers = {
  "youtube-channel": async (source, importedData) => {
    const channelId = source.url.split("/").pop();
    return await getAllVideosFromChannel(channelId, importedData);
  },
  
  "youtube-playlist": async (source, importedData) => {
    const playlistId = source.url.split("list=")[1];
    return await getAllVideosFromPlaylist(playlistId, importedData);
  },
  
  "vimeo": async () => {
    return await getAllVideosFromVimeo();
  }
};

const processVideos = async (videos, videosToIgnore) => {
  const processedVideos = [];
  let ignoredCount = 0;

  for (const video of videos) {
    if (videosToIgnore.includes(video.videoUrl)) {
      ignoredCount++;
      continue;
    }

    const folderName = createFolderName(video.title);
    const folderPath = path.join(OUTPUT_DIR, folderName);
    
    generateMdxFile(video, folderPath);
    processedVideos.push(video);
  }

  return { processedVideos, ignoredCount };
};

const main = async () => {
  try {
    console.log("Start: Gathering video data... 📹");

    const sourcesData = loadJsonFile(SOURCES_FILE);
    const videosToIgnore = loadJsonFile(IGNORE_FILE);
    const importedVideoData = loadJsonFile(OUTPUT_FILE);

    const allVideos = [];
    let totalIgnoredCount = 0;

    // Process each source
    for (const source of sourcesData) {
      const handler = videoHandlers[source.type];
      if (!handler) {
        console.warn(`Unknown source type: ${source.type}`);
        continue;
      }

      const videos = await handler(source, importedVideoData);
      const { processedVideos, ignoredCount } = await processVideos(videos, videosToIgnore);
      
      allVideos.push(...processedVideos);
      totalIgnoredCount += ignoredCount;
    }

    // Combine and sort data
    const combinedVideoData = [...importedVideoData, ...allVideos];
    combinedVideoData.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Save results
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combinedVideoData, null, 2));

    // Report results
    console.log(`Video data written to ${OUTPUT_FILE}`);
    console.log(`Videos added: ${allVideos.length}`);
    console.log(`Ignored videos: ${totalIgnoredCount}`);
    console.log(`New total videos: ${combinedVideoData.length}`);
    console.log("End: Gathering video data. ✅");

  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

// Run the script
main();
