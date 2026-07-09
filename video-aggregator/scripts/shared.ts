// shared.ts
//
// Common fs/JSON helpers and title/thumbnail utilities used across the
// video-aggregator scripts. Extracted in Phase 1 of the refactor plan from
// duplicated (and, in getPosterUrl's case, slightly differently-written but
// behaviorally identical) copies that had drifted apart across
// getVideos.js, getPodcasts.js, and youtube.js. Pure code motion - no
// behavior change from what each caller had before.
//
// Converted to TypeScript in Phase 4 - see the accompanying ADR. Kept as
// CommonJS (require/module.exports) rather than switching to ESM import/
// export: this is a mechanical type-annotation pass, not a module-system
// change, and Node's native type stripping supports plain `require()` calls
// without needing the `import ... = require(...)` TS syntax (which isn't
// erasable and would need a different, less broadly-supported stripping
// mode). Only type-only imports use `import type`, since those are fully
// erased rather than transformed.

import type { PosterThumbnailSource, Frontmatter } from "./types";

const fs = require("fs");
const matter = require("gray-matter");

// Reads and parses a JSON file, returning [] if it doesn't exist yet.
// Previously duplicated as getVideos.js's loadJsonFile and
// getPodcasts.js's utils.loadJsonFile (identical implementations).
// Generic rather than tied to one shape: callers load differently-shaped
// arrays (video records, ignore-list URLs, source configs) through this
// same helper.
function loadJsonFile<T = unknown>(filePath: string): T[] {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf-8")) : [];
}

// Ensures a directory exists, creating it (and any parents) if not.
// Previously duplicated as getPodcasts.js's utils.createDirectory and as
// an inline check in getVideos.js's generateMdxFile.
function createDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Strips punctuation that would otherwise break folder names or frontmatter
// strings. Previously duplicated as getVideos.js's sanitizeTitle and as an
// inline `.replace(...)` call in getPodcasts.js's generateEpisodeMdx
// (identical regex in both places).
function sanitizeTitle(title: string): string {
  return title.replace(/[:"""#'''!?@_^%()]/gi, "");
}

// Picks the best available thumbnail/poster URL, preferring maxres and
// falling back to an upscaled high-quality thumbnail URL. Previously
// duplicated as getVideos.js's getPosterUrl and youtube.js's getPosterUrl -
// those used different null-check styles (optional chaining vs. `&&`
// checks) but were otherwise behaviorally identical for every input.
function getPosterUrl(thumbnails: PosterThumbnailSource): string {
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
function writeContentFile(frontmatter: Frontmatter, body: string = ""): string {
  return matter.stringify(body, frontmatter);
}

// Parses an ISO 8601 duration string (e.g. "PT1H2M3S", as returned by the
// YouTube Data API) into total seconds. Canonical parser - previously
// duplicated as two independent implementations inside youtube.js itself:
// calculateTotalSeconds, and a second regex-based parse buried inside
// formatDuration that never called calculateTotalSeconds at all (see
// ADR 0004).
//
// Parameter is deliberately `unknown`, not `string`: the function's own
// test suite exercises non-string input (null, undefined, numbers) as
// documented defensive behavior, and the first line below is exactly that
// runtime guard. Typing it `string` would make the guard dead code from
// TypeScript's point of view while the tests still expect it to fire.
function parseISO8601DurationToSeconds(rawDuration: unknown): number {
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

  const hours = parseInt(rawDuration.match(/(\d+)H/)?.[1] || "0", 10);
  const minutes = parseInt(rawDuration.match(/(\d+)M/)?.[1] || "0", 10);
  const seconds = parseInt(rawDuration.match(/(\d+)S/)?.[1] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Formats a total-seconds duration as "H:MM:SS". Canonical formatter -
// previously duplicated as youtube.js's own ISO-8601-parsing formatDuration
// and podcast.js's raw-seconds formatDuration (see ADR 0004). Both
// produced identical output for every normal input; the one deliberate
// behavior change from unifying them is documented in the ADR (day-only
// ISO 8601 durations like "P2D" now format as their real duration, e.g.
// "48:00:00", instead of youtube.js's old hardcoded "24:00:00" placeholder).
//
// Parameter is `unknown` for the same reason as above: podcast.js's
// formatDuration wrapper is documented (see its own test) to pass through
// whatever it's given, including non-numeric input, without checking -
// preserving that requires this canonical implementation to accept
// whatever arrives rather than assuming callers already validated it.
function formatSecondsAsDuration(totalSeconds: unknown): string {
  if (!totalSeconds || (totalSeconds as number) <= 0) {
    return "0:00:00";
  }

  const hours = Math.floor((totalSeconds as number) / 3600);
  const minutes = Math.floor(((totalSeconds as number) % 3600) / 60);
  const seconds = Math.floor((totalSeconds as number) % 60);

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
