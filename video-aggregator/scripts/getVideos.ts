// getVideos.ts
//
// Converted to TypeScript in Phase 4 - see the accompanying ADR.

import type { Source, Video } from "./types";

// dotenv 17 logs a "injecting env..." message on every config() call by
// default - quiet it to keep this script's output limited to its own logs.
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const { getAllVideosFromChannel, getAllVideosFromPlaylist } = require("./youtube.ts");
const { getAllVideosFromVimeo } = require("./vimeo.ts");
const { loadJsonFile, createDirectory, sanitizeTitle, getPosterUrl, writeContentFile } = require("./shared.ts");

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
const getCurrentDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const createFolderName = (title: string): string => {
  const sanitized = sanitizeTitle(title);
  return slugify(sanitized, SLUGIFY_OPTIONS)
    .split("-")
    .slice(0, 7)
    .join("-");
};

const generateMdxFile = (video: Video, folderPath: string): void => {
  const indexPath = path.join(folderPath, "index.mdx");

  // Skip if file already exists
  if (fs.existsSync(indexPath)) {
    return;
  }

  // Create folder if it doesn't exist
  createDirectory(folderPath);

  const frontmatter = {
    title: video.title,
    publishedAt: video.publishedAt,
    // Non-null assertion, not optional chaining: the original threw if
    // `high` was ever missing, and this conversion preserves that exact
    // behavior rather than silently swallowing it into `undefined`.
    image: video.thumbnails.high!.url,
    dateAdded: getCurrentDate(),
    poster: getPosterUrl(video.thumbnails),
    videoUrl: video.videoUrl,
    localImages: false,
    tags: ["Unsorted"],
    categories: ["Video"],
    duration: video.duration,
    // gray-matter's YAML serializer throws on `undefined` (unlike
    // JSON.stringify, which silently drops it) - durationSeconds is
    // undefined for Vimeo videos and any video where the source API never
    // returned a duration, so this must be a real value, not undefined.
    durationSeconds: video.durationSeconds ?? null,
    privacyStatus: video.privacyStatus,
    draft: true,
    speakers: ["Unsorted"],
  };

  fs.writeFileSync(indexPath, writeContentFile(frontmatter, video.description));
  console.log(`Created: ${sanitizeTitle(video.title)}`);
};

// Video processing handlers
type VideoHandler = (source: Source, importedData: Video[]) => Promise<Video[]>;

// The "vimeo" handler's signature doesn't match VideoHandler (it takes no
// arguments and calls a function - getAllVideosFromVimeo - that vimeo.ts
// doesn't actually export). Preserved exactly as-is; see the note in
// vimeo.ts and types.ts's Source comment for the pre-existing bug this
// reflects. TypeScript doesn't catch it here because `require()`'s return
// value is untyped (`any`), same as it was in the original JS.
const videoHandlers: Record<string, VideoHandler> = {
  "youtube-channel": async (source, importedData) => {
    const channelId = source.url.split("/").pop() as string;
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

const processVideos = async (
  videos: Video[],
  videosToIgnore: string[],
): Promise<{ processedVideos: Video[]; ignoredCount: number }> => {
  const processedVideos: Video[] = [];
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

const main = async (): Promise<void> => {
  try {
    console.log("Start: Gathering video data... 📹");

    // `as` casts, not loadJsonFile<T>(): require()'s return is untyped
    // (`any`), so generic type arguments can't flow through a plain
    // require() call - TS rejects them ("untyped function calls may not
    // accept type arguments"). Casting the result achieves the same typing
    // for these variables without needing generic inference across the
    // require() boundary.
    const sourcesData = loadJsonFile(SOURCES_FILE) as Source[];
    const videosToIgnore = loadJsonFile(IGNORE_FILE) as string[];
    const importedVideoData = loadJsonFile(OUTPUT_FILE) as Video[];

    const allVideos: Video[] = [];
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
    combinedVideoData.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    // Save results
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combinedVideoData, null, 2));

    // Report results
    console.log(`Video data written to ${OUTPUT_FILE}`);
    console.log(`Videos added: ${allVideos.length}`);
    console.log(`Ignored videos: ${totalIgnoredCount}`);
    console.log(`New total videos: ${combinedVideoData.length}`);
    console.log("End: Gathering video data. ✅");

  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

// Run the script (only when executed directly, not when required by tests)
if (require.main === module) {
  main();
}

module.exports = {
  sanitizeTitle,
  createFolderName,
  getPosterUrl,
  generateMdxFile,
};
