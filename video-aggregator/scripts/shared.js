// shared.js
//
// Common fs/JSON helpers and title/thumbnail utilities used across the
// video-aggregator scripts. Extracted in Phase 1 of the refactor plan from
// duplicated (and, in getPosterUrl's case, slightly differently-written but
// behaviorally identical) copies that had drifted apart across
// getVideos.js, getPodcasts.js, and youtube.js. Pure code motion - no
// behavior change from what each caller had before.

const fs = require("fs");

// Reads and parses a JSON file, returning [] if it doesn't exist yet.
// Previously duplicated as getVideos.js's loadJsonFile and
// getPodcasts.js's utils.loadJsonFile (identical implementations).
function loadJsonFile(filePath) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : [];
}

// Ensures a directory exists, creating it (and any parents) if not.
// Previously duplicated as getPodcasts.js's utils.createDirectory and as
// an inline check in getVideos.js's generateMdxFile.
function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Strips punctuation that would otherwise break folder names or frontmatter
// strings. Previously duplicated as getVideos.js's sanitizeTitle and as an
// inline `.replace(...)` call in getPodcasts.js's generateEpisodeMdx
// (identical regex in both places).
function sanitizeTitle(title) {
  return title.replace(/[:"""#'''!?@_^%()]/gi, "");
}

// Picks the best available thumbnail/poster URL, preferring maxres and
// falling back to an upscaled high-quality thumbnail URL. Previously
// duplicated as getVideos.js's getPosterUrl and youtube.js's getPosterUrl -
// those used different null-check styles (optional chaining vs. `&&`
// checks) but were otherwise behaviorally identical for every input.
function getPosterUrl(thumbnails) {
  if (thumbnails.maxres?.url) {
    return thumbnails.maxres.url;
  }
  if (thumbnails.high?.url) {
    return thumbnails.high.url.replace("hqdefault.jpg", "maxresdefault.jpg");
  }
  return "";
}

module.exports = {
  loadJsonFile,
  createDirectory,
  sanitizeTitle,
  getPosterUrl,
};
