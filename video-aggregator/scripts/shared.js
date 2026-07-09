// shared.js
//
// Common fs/JSON helpers and title/thumbnail utilities used across the
// video-aggregator scripts. Extracted in Phase 1 of the refactor plan from
// duplicated (and, in getPosterUrl's case, slightly differently-written but
// behaviorally identical) copies that had drifted apart across
// getVideos.js, getPodcasts.js, and youtube.js. Pure code motion - no
// behavior change from what each caller had before.

const fs = require("fs");
const matter = require("gray-matter");

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

// Builds a `.mdx` file's full contents (YAML frontmatter + body) from a
// plain data object, via gray-matter's stringify (already a project
// dependency, previously only used for reading in getImages.js).
//
// Phase 2 of the refactor plan: replaces hand-built template literals like
// `title: "${video.title}"` in getVideos.js/getPodcasts.js, which never
// escaped embedded quotes and produced invalid YAML for any title
// containing a `"` (see ADR 0003). Passing real JS values through a real
// YAML serializer instead of string interpolation fixes that whole bug
// class at once: strings are quoted/escaped correctly, and other types
// (numbers, booleans, null, arrays) are emitted as proper YAML rather than
// relying on each call site to format them by hand.
function writeContentFile(frontmatter, body = "") {
  return matter.stringify(body, frontmatter);
}

// Parses an ISO 8601 duration string (e.g. "PT1H2M3S", as returned by the
// YouTube Data API) into total seconds. Canonical parser - previously
// duplicated as two independent implementations inside youtube.js itself:
// calculateTotalSeconds, and a second regex-based parse buried inside
// formatDuration that never called calculateTotalSeconds at all (see
// ADR 0004).
function parseISO8601DurationToSeconds(rawDuration) {
  if (!rawDuration || typeof rawDuration !== "string") {
    return 0;
  }

  // Live streams, premieres, or still-processing videos report one of
  // these rather than a real duration.
  if (rawDuration === "P0D" || rawDuration === "PT0S" || rawDuration === "PT") {
    return 0;
  }

  // Day-only durations (e.g. "P2D") - rare, but the API can return them.
  const daysMatch = rawDuration.match(/^P(\d+)D$/);
  if (daysMatch) {
    return parseInt(daysMatch[1], 10) * 24 * 60 * 60;
  }

  const hours = parseInt(rawDuration.match(/(\d+)H/)?.[1] || 0, 10);
  const minutes = parseInt(rawDuration.match(/(\d+)M/)?.[1] || 0, 10);
  const seconds = parseInt(rawDuration.match(/(\d+)S/)?.[1] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Formats a total-seconds duration as "H:MM:SS". Canonical formatter -
// previously duplicated as youtube.js's own ISO-8601-parsing formatDuration
// and podcast.js's raw-seconds formatDuration (see ADR 0004). Both
// produced identical output for every normal input; the one deliberate
// behavior change from unifying them is documented in the ADR (day-only
// ISO 8601 durations like "P2D" now format as their real duration, e.g.
// "48:00:00", instead of youtube.js's old hardcoded "24:00:00" placeholder).
function formatSecondsAsDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) {
    return "0:00:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

module.exports = {
  loadJsonFile,
  createDirectory,
  sanitizeTitle,
  getPosterUrl,
  writeContentFile,
  parseISO8601DurationToSeconds,
  formatSecondsAsDuration,
};
