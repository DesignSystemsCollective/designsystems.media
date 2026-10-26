import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

// transcript.ts wraps youtube-captions-scraper's getSubtitles, which hits
// YouTube's caption endpoint over the network - mocked here the same way
// content-aggregator-youtube-api.test.mjs mocks "googleapis", so this suite
// exercises transcript.ts's own id-extraction/join/error-handling logic
// rather than the real network call.

const state = {
  getSubtitles: async () => {
    throw new Error("no captions");
  },
};

mock.module("youtube-captions-scraper", {
  exports: {
    getSubtitles: (...args) => state.getSubtitles(...args),
  },
});

const { fetchTranscript } = await import(
  "../../../content-aggregator/scripts/video/transcript.ts"
);

test("fetchTranscript: joins caption segments into plain text", async () => {
  // getSubtitles already HTML-decodes/strips tags internally (verified by
  // its own source) - its `text` segments arrive here already clean, so
  // this fixture reflects that rather than raw/escaped input.
  state.getSubtitles = async ({ videoID, lang }) => {
    assert.equal(videoID, "abc123");
    assert.equal(lang, "en");
    return [
      { start: 0, dur: 2, text: "Hello & welcome" },
      { start: 2, dur: 3, text: "to the talk." },
    ];
  };

  const transcript = await fetchTranscript("https://www.youtube.com/watch?v=abc123");

  assert.equal(transcript, "Hello & welcome to the talk.");
});

test("fetchTranscript: returns null when the video has no captions", async () => {
  state.getSubtitles = async () => {
    throw new Error("Could not find captions for video: abc123");
  };

  const transcript = await fetchTranscript("https://www.youtube.com/watch?v=abc123");

  assert.equal(transcript, null);
});

test("fetchTranscript: returns null for a URL with no video ID", async () => {
  const transcript = await fetchTranscript("https://www.youtube.com/watch");

  assert.equal(transcript, null);
});

test("fetchTranscript: returns null when getSubtitles resolves with an empty list", async () => {
  state.getSubtitles = async () => [];

  const transcript = await fetchTranscript("https://www.youtube.com/watch?v=abc123");

  assert.equal(transcript, null);
});
