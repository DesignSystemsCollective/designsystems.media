import test from "node:test";
import assert from "node:assert/strict";
import { getAudioMimeType } from "../../utils/audio.ts";

// Phase 7 of the refactor plan: src/utils/* was flagged as untested-but-cheap
// (pure functions, no I/O). These tests pin current behavior.

test("getAudioMimeType maps known extensions to their MIME type", () => {
  assert.equal(getAudioMimeType("episode.mp3"), "audio/mpeg");
  assert.equal(getAudioMimeType("episode.wav"), "audio/wav");
  assert.equal(getAudioMimeType("episode.ogg"), "audio/ogg");
  assert.equal(getAudioMimeType("episode.oga"), "audio/ogg");
  assert.equal(getAudioMimeType("episode.m4a"), "audio/mp4");
  assert.equal(getAudioMimeType("episode.aac"), "audio/aac");
  assert.equal(getAudioMimeType("episode.flac"), "audio/flac");
  assert.equal(getAudioMimeType("episode.webm"), "audio/webm");
});

test("getAudioMimeType is case-insensitive on the extension", () => {
  assert.equal(getAudioMimeType("episode.MP3"), "audio/mpeg");
  assert.equal(getAudioMimeType("episode.WAV"), "audio/wav");
});

test("getAudioMimeType extracts the extension from a full URL despite dots earlier in the domain", () => {
  // split(".").pop() operates on the whole string, so "example.com" earlier
  // in the URL doesn't interfere - only the true last segment is used. A
  // non-default extension (audio/wav rather than the audio/mpeg fallback)
  // confirms this is a real match, not a coincidental default.
  assert.equal(getAudioMimeType("https://example.com/episode.wav"), "audio/wav");
});

test("getAudioMimeType defaults to audio/mpeg for unknown or missing extensions", () => {
  assert.equal(getAudioMimeType("episode.xyz"), "audio/mpeg");
  assert.equal(getAudioMimeType("episode"), "audio/mpeg");
  assert.equal(getAudioMimeType("episode."), "audio/mpeg");
});

test("getAudioMimeType defaults to audio/mpeg for undefined or empty input", () => {
  assert.equal(getAudioMimeType(undefined), "audio/mpeg");
  assert.equal(getAudioMimeType(""), "audio/mpeg");
});
