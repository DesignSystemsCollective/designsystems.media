import test from "node:test";
import assert from "node:assert/strict";
import youtube from "../../../video-aggregator/scripts/youtube.js";
import podcast from "../../../video-aggregator/scripts/podcast.js";

const { formatDuration: formatYoutubeDuration, calculateTotalSeconds } = youtube;
const { formatDuration: formatPodcastDuration } = podcast;

// These two duration implementations are independent and inconsistent by
// design today (Phase 3 of the refactor plan unifies them into one). This
// file pins their current, as-is behavior so that unification has a clear
// "before" to diff against.

test("youtube.js calculateTotalSeconds parses ISO 8601 durations", () => {
  assert.equal(calculateTotalSeconds("PT1H2M3S"), 3723);
  assert.equal(calculateTotalSeconds("PT45M"), 2700);
  assert.equal(calculateTotalSeconds("PT30S"), 30);
  assert.equal(calculateTotalSeconds("P2D"), 172800);
});

test("youtube.js calculateTotalSeconds treats live/processing markers as 0", () => {
  assert.equal(calculateTotalSeconds("P0D"), 0);
  assert.equal(calculateTotalSeconds("PT0S"), 0);
  assert.equal(calculateTotalSeconds("PT"), 0);
});

test("youtube.js calculateTotalSeconds returns 0 for invalid input", () => {
  assert.equal(calculateTotalSeconds(null), 0);
  assert.equal(calculateTotalSeconds(undefined), 0);
  assert.equal(calculateTotalSeconds(""), 0);
  assert.equal(calculateTotalSeconds(42), 0);
});

test("youtube.js formatDuration formats ISO 8601 durations as H:MM:SS", () => {
  assert.equal(formatYoutubeDuration("PT1H2M3S"), "1:02:03");
  assert.equal(formatYoutubeDuration("PT45M"), "0:45:00");
  assert.equal(formatYoutubeDuration("PT30S"), "0:00:30");
});

test("youtube.js formatDuration has special-cased placeholders", () => {
  // Live/premiere/processing videos
  assert.equal(formatYoutubeDuration("P0D"), "0:00:00");
  assert.equal(formatYoutubeDuration("PT0S"), "0:00:00");
  assert.equal(formatYoutubeDuration("PT"), "0:00:00");
  // Day-only durations get a fixed placeholder rather than a real value
  assert.equal(formatYoutubeDuration("P2D"), "24:00:00");
});

test("youtube.js formatDuration falls back to 0:00:00 for invalid input", () => {
  assert.equal(formatYoutubeDuration(null), "0:00:00");
  assert.equal(formatYoutubeDuration(undefined), "0:00:00");
  assert.equal(formatYoutubeDuration("not-a-duration"), "0:00:00");
});

test("podcast.js formatDuration formats raw seconds as H:MM:SS", () => {
  assert.equal(formatPodcastDuration(3723), "1:02:03");
  assert.equal(formatPodcastDuration(2700), "0:45:00");
  assert.equal(formatPodcastDuration(45), "0:00:45");
});

test("podcast.js formatDuration falls back to 0:00:00 for falsy input", () => {
  assert.equal(formatPodcastDuration(0), "0:00:00");
  assert.equal(formatPodcastDuration(null), "0:00:00");
  assert.equal(formatPodcastDuration(undefined), "0:00:00");
});

test("the two implementations take incompatible inputs (pinning the duplication)", () => {
  // youtube.js expects an ISO 8601 string; podcast.js expects raw seconds.
  // Feeding either implementation the other's input shape does not produce
  // an equivalent result today - this is exactly the duplication Phase 3
  // is meant to remove.
  assert.equal(formatYoutubeDuration("3723"), "0:00:00");
  // podcast.js does no type-checking on its input, so a string sails
  // through its arithmetic and produces NaN components rather than a
  // guarded fallback - pinned as-is here.
  assert.equal(formatPodcastDuration("PT1H2M3S"), "NaN:NaN:NaN");
});
