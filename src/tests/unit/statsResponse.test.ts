import test from "node:test";
import assert from "node:assert/strict";
import { buildStatsSuccessBody, buildStatsErrorBody } from "../../utils/statsResponse.ts";

// Phase 7 of the refactor plan: this is the pure logic extracted from
// src/pages/api/stats.json.js so it's testable outside the Astro request
// lifecycle. generateSocial.js was also in scope for this phase, but on
// inspection it has no comparable pure logic to extract - it's a two-line
// delegation straight to generateSocialImages.ts's runAllMosaics(), which
// is already excluded from unit coverage as I/O-heavy (fs/sharp), matching
// the original 2026-07-08 audit's framing of the untested src/utils/*
// gap as "pure functions, cheap to test" (this one isn't).

test("buildStatsSuccessBody wraps the given stats under a 'stats' key", () => {
  const stats = { videos: 42, podcastEpisodes: 7, speakers: 3, tags: 12 };
  assert.deepEqual(buildStatsSuccessBody(stats), { stats });
});

test("buildStatsSuccessBody passes the stats value through unmodified", () => {
  const stats = { videos: 0 };
  const body = buildStatsSuccessBody(stats);
  assert.equal(body.stats, stats);
});

test("buildStatsErrorBody shapes a fixed error label with the thrown error's message", () => {
  const error = new Error("content-domain blew up");
  assert.deepEqual(buildStatsErrorBody(error), {
    error: "Failed to generate library stats",
    message: "content-domain blew up",
  });
});

test("buildStatsErrorBody produces message: undefined for a non-Error throw (pinned quirk, not fixed)", () => {
  // Matches the original route's unguarded `error.message` access - a
  // thrown string/plain object without a `.message` property yields
  // `undefined` here, same as before this was extracted.
  assert.deepEqual(buildStatsErrorBody("just a string"), {
    error: "Failed to generate library stats",
    message: undefined,
  });
});
