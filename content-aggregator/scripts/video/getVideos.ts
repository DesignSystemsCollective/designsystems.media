// getVideos.ts
//
// Converted to TypeScript in Phase 4 - see the accompanying ADR.

import type { Source, Video } from "../shared/types";

// dotenv 17 logs a "injecting env..." message on every config() call by
// default - quiet it to keep this script's output limited to its own logs.
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const { getAllVideosFromChannel, getAllVideosFromPlaylist } = require("./youtube.ts");
const {
  loadJsonFile,
  createDirectory,
  sanitizeTitle,
  getPosterUrl,
  writeContentFile,
  mapWithConcurrency,
} = require("../shared/shared.ts");

// Constants
const DATA_DIR = path.join(__dirname, "../../data");
const OUTPUT_DIR = path.join(__dirname, "../../../src/content/media/");
const SOURCES_FILE = path.join(DATA_DIR, "sources.json");
const IGNORE_FILE = path.join(DATA_DIR, "ignore.json");
const OUTPUT_FILE = path.join(DATA_DIR, "output.json");

// How many sources to fetch concurrently in main() below. Each source is an
// independent network round trip to YouTube, and they used to run one at a
// time, so total run time was the sum of every source's latency instead of
// roughly the slowest one. Capped rather than unbounded to stay reasonably
// polite to the API instead of firing every configured source's requests at
// once.
const SOURCE_FETCH_CONCURRENCY = 4;

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
    // undefined for any video where the source API never returned a
    // duration (youtube.ts only sets it when contentDetails.duration is
    // present), so this must be a real value, not undefined.
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

// Vimeo support was removed (not fixed) - see ADR 0016. vimeo.ts called a
// function it never exported, and this handler map never had a "vimeo-
// channel" key matching sources.json's actual entry, so the source was
// silently skipped on every run. Rather than build real Vimeo channel
// listing, the dead code and the sources.json entry were both deleted.
const videoHandlers: Record<string, VideoHandler> = {
  "youtube-channel": async (source, importedData) => {
    const channelId = source.url.split("/").pop() as string;
    return await getAllVideosFromChannel(channelId, importedData);
  },

  "youtube-playlist": async (source, importedData) => {
    const playlistId = source.url.split("list=")[1];
    return await getAllVideosFromPlaylist(playlistId, importedData);
  },
};

const processVideos = async (
  videos: Video[],
  videosToIgnore: string[],
  outputDir: string = OUTPUT_DIR,
): Promise<{ processedVideos: Video[]; ignoredCount: number }> => {
  const processedVideos: Video[] = [];
  let ignoredCount = 0;

  for (const video of videos) {
    if (videosToIgnore.includes(video.videoUrl)) {
      ignoredCount++;
      continue;
    }

    const folderName = createFolderName(video.title);
    const folderPath = path.join(outputDir, folderName);

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

    // Fetch every source concurrently (bounded by SOURCE_FETCH_CONCURRENCY)
    // - the network round trip to YouTube is the actual bottleneck, not the
    // local file-writing that follows. mapWithConcurrency returns results
    // in the same order as sourcesData regardless of which source's fetch
    // finishes first, so applying them below - writing each source's .mdx
    // files - happens sequentially in the same fixed order the fully
    // sequential version used, keeping output identical (just fetched
    // faster). Safe to fetch concurrently because each source's videos are
    // independent of every other source's: unlike getPodcasts.ts's
    // ShowManager, there's no shared dedup state across sources here that
    // fetch order could affect.
    const videosPerSource = await mapWithConcurrency(
      sourcesData,
      SOURCE_FETCH_CONCURRENCY,
      async (source) => {
        const handler = videoHandlers[source.type];
        if (!handler) {
          console.warn(`Unknown source type: ${source.type}`);
          return [];
        }
        return await handler(source, importedVideoData);
      },
    );

    for (const videos of videosPerSource) {
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
  processVideos,
  videoHandlers,
};
