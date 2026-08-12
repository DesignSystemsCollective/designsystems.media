import test from "node:test";
import assert from "node:assert/strict";
import shared from "../../../content-aggregator/scripts/shared/shared.ts";
import youtube from "../../../content-aggregator/scripts/video/youtube.ts";
import podcast from "../../../content-aggregator/scripts/podcast/podcast.ts";

const { parseISO8601DurationToSeconds, formatSecondsAsDuration } = shared;
const { formatDuration: formatYoutubeDuration, calculateTotalSeconds } = youtube;
const { formatDuration: formatPodcastDuration } = podcast;

// Phase 3 of the refactor plan: youtube.js's ISO 8601 parser and
// podcast.js's raw-seconds formatter are no longer independent
// implementations - both now delegate to shared.js's
// parseISO8601DurationToSeconds/formatSecondsAsDuration. youtube.js and
// podcast.js keep their original exported function names as thin wrappers
// so nothing importing them had to change (see ADR 0004).

test("parseISO8601DurationToSeconds parses normal durations", () => {
  assert.equal(parseISO8601DurationToSeconds("PT1H2M3S"), 3723);
  assert.equal(parseISO8601DurationToSeconds("PT45M"), 2700);
  assert.equal(parseISO8601DurationToSeconds("PT30S"), 30);
});

test("parseISO8601DurationToSeconds treats live/processing markers as 0", () => {
  assert.equal(parseISO8601DurationToSeconds("P0D"), 0);
  assert.equal(parseISO8601DurationToSeconds("PT0S"), 0);
  assert.equal(parseISO8601DurationToSeconds("PT"), 0);
});

test("parseISO8601DurationToSeconds converts day-only durations to real seconds", () => {
  assert.equal(parseISO8601DurationToSeconds("P2D"), 172800);
});

test("parseISO8601DurationToSeconds returns 0 for invalid input", () => {
  assert.equal(parseISO8601DurationToSeconds(null), 0);
  assert.equal(parseISO8601DurationToSeconds(undefined), 0);
  assert.equal(parseISO8601DurationToSeconds(""), 0);
  assert.equal(parseISO8601DurationToSeconds(42), 0);
  assert.equal(parseISO8601DurationToSeconds("not-a-duration"), 0);
});

test("formatSecondsAsDuration formats seconds as H:MM:SS", () => {
  assert.equal(formatSecondsAsDuration(3723), "1:02:03");
  assert.equal(formatSecondsAsDuration(2700), "0:45:00");
  assert.equal(formatSecondsAsDuration(45), "0:00:45");
});

test("formatSecondsAsDuration falls back to 0:00:00 for falsy/non-positive input", () => {
  assert.equal(formatSecondsAsDuration(0), "0:00:00");
  assert.equal(formatSecondsAsDuration(null), "0:00:00");
  assert.equal(formatSecondsAsDuration(undefined), "0:00:00");
  assert.equal(formatSecondsAsDuration(-5), "0:00:00");
});

// youtube.js: thin wrappers over the shared functions

test("youtube.js calculateTotalSeconds delegates to the shared parser", () => {
  assert.equal(calculateTotalSeconds("PT1H2M3S"), 3723);
  assert.equal(calculateTotalSeconds("P2D"), 172800);
  assert.equal(calculateTotalSeconds(null), 0);
});

test("youtube.js formatDuration delegates to shared parse+format", () => {
  assert.equal(formatYoutubeDuration("PT1H2M3S"), "1:02:03");
  assert.equal(formatYoutubeDuration("P0D"), "0:00:00");
  assert.equal(formatYoutubeDuration(null), "0:00:00");
  assert.equal(formatYoutubeDuration("not-a-duration"), "0:00:00");
});

test("youtube.js formatDuration: day-only durations now format as their real duration (Phase 3 behavior change)", () => {
  // Previously hardcoded to a "24:00:00" placeholder regardless of the
  // actual day count - see ADR 0004 for why this was changed rather than
  // preserved when the two parsers were unified.
  assert.equal(formatYoutubeDuration("P2D"), "48:00:00");
});

// podcast.js: thin wrapper over the shared formatter

test("podcast.js formatDuration delegates to the shared formatter", () => {
  assert.equal(formatPodcastDuration(3723), "1:02:03");
  assert.equal(formatPodcastDuration(45), "0:00:45");
  assert.equal(formatPodcastDuration(0), "0:00:00");
  assert.equal(formatPodcastDuration(null), "0:00:00");
});

test("podcast.js formatDuration still does no type-checking on its input (unchanged edge case)", () => {
  // Neither the old implementation nor the shared one guards against a
  // non-numeric input here; pinning this as an unchanged, known quirk
  // rather than something Phase 3 was scoped to fix.
  assert.equal(formatPodcastDuration("PT1H2M3S"), "NaN:NaN:NaN");
});
