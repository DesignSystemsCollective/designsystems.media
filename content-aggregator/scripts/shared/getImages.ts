// getImages.ts
//
// Converted to TypeScript in Phase 4 - see the accompanying ADR. Function
// signatures are typed; the `data` object parsed from each file's
// frontmatter is left as `any` (gray-matter's `matter()` call is itself
// untyped, via the same plain require() pattern used throughout this
// conversion) rather than typed against Frontmatter and cast at every
// property access. This file's whole job is dynamically reading, mutating,
// and rewriting YAML frontmatter across three different content shapes
// (show/episode/media) with the same code paths - fighting that with casts
// at every `data.image`/`data.localImages` access would add noise without
// catching real bugs, unlike updateMarkdownFile below where `data` really
// is just "some object" being serialized generically.

import type { Frontmatter } from "./types";

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const matter = require("gray-matter");
const { writeContentFile } = require("./shared.ts");

const MAX_RETRY_COUNT = 3; // Number of times to retry a failed download

// Define your folder paths
const folderPaths = [
  path.join(__dirname, "../../../src/content/media/"),
  path.join(__dirname, "../../../src/content/podcast/"),
  path.join(__dirname, "../../../src/content/show/"), // New show folder
];

// Helper function to download an image with retries
async function downloadImageWithRetry(
  url: string,
  outputFilePath: string,
  retryCount: number = 0,
): Promise<void> {
  try {
   // console.log(`Downloading: ${url}`);
    await downloadImage(url, outputFilePath);
    //console.log(`Downloaded: ${url}`);
  } catch (error) {
    if (retryCount < MAX_RETRY_COUNT) {
      await delay(500); // Delay for 500 milliseconds before retrying
      await downloadImageWithRetry(url, outputFilePath, retryCount + 1);
    } else {
      throw error;
    }
  }
}

// Helper function to download an image
function downloadImage(url: string, outputFilePath: string): Promise<void> {
  return axios({
    method: "get",
    url,
    responseType: "stream",
  }).then((response: any) => {
    return new Promise<void>((resolve, reject) => {
      const stream = response.data.pipe(fs.createWriteStream(outputFilePath));
      stream.on("finish", () => resolve());
      stream.on("error", (error: any) => reject(error));
    });
  });
}

// Function to process show Markdown files
async function processShowMarkdownFile(filePath: string): Promise<void> {
  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  // If localImages is already true, skip downloading.
  if (data.localImages === true) {
    return;
  }

  // Define the desired new filename for the downloaded image
  const newPosterFileName = "poster.jpg";
  const posterOutputPath = path.join(path.dirname(filePath), newPosterFileName);

  // Check if data.image exists and localImages is false
  if (data.image && data.title) {
    try {
      // console.log(`Attempting to download show image: ${data.image}`);
      await downloadImageWithRetry(data.image, posterOutputPath);
      console.log(`✅ ${data.title}`);

      // Update image reference to local file
      data.image = `./${newPosterFileName}`;
      data.localImages = true; // Mark as locally handled

      updateMarkdownFile(filePath, data, content);
    } catch (err: any) {
      // Download failed after retries. Astro's image() schema resolves this
      // field as a local file path at build time and throws a fatal error
      // if it can't be resolved - so we must not point it at a file that
      // doesn't exist (as the old `./hqdefault.jpg` placeholder did).
      // Instead, remove the field and leave localImages false so a future
      // run retries the download.
      console.error(
        `Error downloading show image "${data.image}": ${err.message}. Leaving image unset for retry on next run.`
      );
      delete data.image;
      data.localImages = false;
      updateMarkdownFile(filePath, data, content);
    }
  }
}

// Function to process episode Markdown files
async function processEpisodeMarkdownFile(filePath: string): Promise<void> {
  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  // If localImages is already true, skip processing.
  if (data.localImages === true) {
    return;
  }

  // Check if this episode has a custom episode image
  if (data.hasEpisodeImage && data.image && data.title && !data.image.startsWith('../show/')) {
    // This episode has its own custom image, download it
    const newPosterFileName = "poster.jpg";
    const posterOutputPath = path.join(path.dirname(filePath), newPosterFileName);

    try {
     // console.log(`Attempting to download episode-specific image: ${data.image}`);
      await downloadImageWithRetry(data.image, posterOutputPath);
      console.log(`✅ ${data.title}`);

      // Update image reference to local file
      data.image = `./${newPosterFileName}`;
      data.localImages = true;

      updateMarkdownFile(filePath, data, content);
    } catch (err: any) {
      // Fallback to the show's image if the episode-specific download
      // fails. Only use it if the show's poster.jpg genuinely exists on
      // disk - otherwise this trades one broken reference for another (e.g.
      // if the show's own image download also failed).
      console.error(`Error downloading episode image "${data.image}": ${err.message}. Falling back to show image.`);

      const showPosterRelativePath = data.showSlug ? `../show/${data.showSlug}/poster.jpg` : null;
      const showPosterAbsolutePath = showPosterRelativePath
        ? path.join(path.dirname(filePath), showPosterRelativePath)
        : null;

      if (showPosterAbsolutePath && fs.existsSync(showPosterAbsolutePath)) {
        data.image = showPosterRelativePath;
        data.localImages = true;
      } else {
        // No usable fallback. Astro's image() schema requires this field to
        // resolve to a real local file when present, so we can't point it
        // at a nonexistent placeholder - leave it unset for retry instead.
        data.image = null;
        data.localImages = false;
      }

      data.hasEpisodeImage = false; // Mark that we're not using episode-specific image
      updateMarkdownFile(filePath, data, content);
    }
  } else {
    // This episode uses show image or already has correct reference
    // Just mark as processed if it references a show image
    if (data.image && (data.image.startsWith('../show/') || data.showSlug)) {
      data.localImages = true;

      // Ensure the image path is correctly formatted
      if (data.showSlug && !data.image.startsWith('../show/')) {
        data.image = `../show/${data.showSlug}/poster.jpg`;
      }

      updateMarkdownFile(filePath, data, content);
      console.log(`Episode references show image: ${data.image}`);
    }
  }
}

// Function to process media (video) Markdown files - handles the
// poster/image download flow for anything that isn't a show or episode.
//
// This used to be inlined directly in processMarkdownFile under a "legacy
// processing for files without type specified" comment, as if it were a
// fallback for old content. It isn't: getVideos.ts's frontmatter has never
// set a `type` field (see generateMdxFile), so every media/video file in
// the site takes this path today - it's the live, primary handling for one
// of the three content kinds this script processes, not a legacy fallback.
// Named and extracted to match processShowMarkdownFile/
// processEpisodeMarkdownFile's shape instead of staying an unlabeled `else`
// branch. It still doubles as the generic catch-all for any file that
// matches neither a show nor an episode, which is what makes it safe to
// keep matching on the *absence* of a show/podcast signal rather than
// requiring an explicit `type: "media"` (a defensive default, kept as-is).
async function processMediaMarkdownFile(filePath: string): Promise<void> {
  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(markdownContent);

  // If localImages is already true, skip downloading.
  if (data.localImages === true) {
    return;
  }

  // Define the desired new filename for the downloaded image
  const newPosterFileName = "poster.jpg";
  const posterOutputPath = path.join(path.dirname(filePath), newPosterFileName);

  // Check if data.poster exists and localImages is false
  if (data.poster) {
    try {
      //console.log(`Attempting to download poster: ${data.poster}`);
      await downloadImageWithRetry(data.poster, posterOutputPath);
      console.log(`Successfully downloaded poster: ${data.poster}`);

      // Update both 'image' and 'poster' to point to the newly downloaded 'poster.jpg'
      data.image = `./${newPosterFileName}`;
      data.poster = `./${newPosterFileName}`;
      data.localImages = true; // Mark as locally handled

      updateMarkdownFile(filePath, data, content);
    } catch (err: any) {
      // Download failed after retries. Astro's image() schema throws a
      // fatal build error if this field can't be resolved to a real local
      // file, so we must not point it at a nonexistent placeholder - remove
      // both fields and leave localImages false so a future run retries.
      console.error(
        `Error downloading poster image "${data.poster}": ${err.message}. Leaving image unset for retry on next run.`
      );
      delete data.image;
      delete data.poster;
      data.localImages = false;
      updateMarkdownFile(filePath, data, content);
    }
  } else {
    // If data.poster doesn't exist but data.image does, we can still attempt to download 'image'
    // and rename it to poster.jpg, then set both to that.
    if (data.image) {
      try {
        console.log(`Poster not found, attempting to download image as poster: ${data.image}`);
        await downloadImageWithRetry(data.image, posterOutputPath);
        console.log(`Successfully downloaded image as poster: ${data.image}`);

        data.image = `./${newPosterFileName}`;
        data.poster = `./${newPosterFileName}`;
        data.localImages = true;
        updateMarkdownFile(filePath, data, content);
      } catch (err: any) {
        console.error(
          `Error downloading image for poster fallback "${data.image}": ${err.message}. Leaving image unset for retry on next run.`
        );
        delete data.image;
        delete data.poster;
        data.localImages = false;
        updateMarkdownFile(filePath, data, content);
      }
    }
  }
}

// Dispatches a Markdown file to its content-kind-specific handler, based on
// an explicit `type` field first and a path-based fallback second (older
// show/episode content predates the `type` field being written).
async function processMarkdownFile(filePath: string): Promise<void> {
  const markdownContent = fs.readFileSync(filePath, "utf8");
  const { data } = matter(markdownContent);

  if (data.type === "show" || filePath.includes("/show/")) {
    return await processShowMarkdownFile(filePath);
  } else if (data.type === "podcast" || filePath.includes("/podcast/")) {
    return await processEpisodeMarkdownFile(filePath);
  }

  return await processMediaMarkdownFile(filePath);
}

// Helper function to introduce a delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to update the Markdown file with new front matter and content
//
// Previously hand-built frontmatter with `${key}: ${JSON.stringify(value)}`
// per line - the exact bug class ADR 0003 fixed in getVideos.ts/
// getPodcasts.ts (ordinary JSON.stringify doesn't produce valid YAML for
// every string - e.g. a title containing a literal newline or a YAML
// special character at the start of the value). This was the one remaining
// writer in the codebase not going through the canonical serializer. Now
// delegates to shared.ts's writeContentFile (gray-matter's real YAML
// stringify), same as every other frontmatter writer here.
function updateMarkdownFile(filePath: string, data: Frontmatter, content: string): void {
  fs.writeFileSync(filePath, writeContentFile(data, content));
}

// Function to recursively process Markdown files in a directory
async function processMarkdownFiles(directory: string): Promise<void> {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      await processMarkdownFiles(filePath);
    } else if (path.extname(file) === ".mdx") {
      await processMarkdownFile(filePath);
    }
  }
}

// Process shows first, then episodes
async function processInOrder(): Promise<void> {
  console.log("Processing show images first...");
  const showsPath = path.join(__dirname, "../../../src/content/show/");
  if (fs.existsSync(showsPath)) {
    await processMarkdownFiles(showsPath);
  }

  // Add a delay to ensure show images are processed before episodes
  await delay(1000);

  console.log("Processing episode images...");
  const episodesPath = path.join(__dirname, "../../../src/content/podcast/");
  if (fs.existsSync(episodesPath)) {
    await processMarkdownFiles(episodesPath);
  }

  // Process other folders
  for (const folderPath of folderPaths) {
    if (folderPath.includes("/show/") || folderPath.includes("/podcast/")) {
      continue; // Already processed above
    }

    if (fs.existsSync(folderPath)) {
      // console.log(`Processing files in: ${folderPath}`);
      await processMarkdownFiles(folderPath);
    }
  }
}

// Run the processing in order (only when executed directly, not when
// required by tests)
if (require.main === module) {
  processInOrder().catch(console.error);
}

module.exports = {
  processShowMarkdownFile,
  processEpisodeMarkdownFile,
  processMediaMarkdownFile,
  processMarkdownFile,
  updateMarkdownFile,
};
