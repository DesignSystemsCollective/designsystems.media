// vimeo.ts
//
// Converted to TypeScript in Phase 4 - see the accompanying ADR.
//
// NOTE (found during this conversion, not fixed here - out of scope for a
// TS conversion pass): getVideos.js imports and calls
// `getAllVideosFromVimeo()`, but this file has never exported a function by
// that name - only `getVideoDataFromVimeo(videoId)`, a single-video lookup
// with a different signature. Separately, sources.json's Vimeo entry is
// typed "vimeo-channel", but getVideos.js's handler map only recognizes
// "vimeo" - so the mismatched function call is never actually reached; the
// source is silently skipped with a "Unknown source type" warning instead.
// Vimeo ingestion is currently fully inert. Flagged to Frank as a separate
// decision; this conversion preserves the existing (broken) behavior
// exactly rather than fixing it as a side effect.
//
// getVideoDataFromVimeo's return shape doesn't populate every Video field
// (no privacyStatus, no durationSeconds - this integration has never
// computed a duration at all, which is also why ADR 0004's durationSeconds
// fix had to guard against it being undefined). Typed as Partial<Video>
// rather than Video to reflect that honestly instead of inventing values
// that were never actually there.

import type { Video } from "./types";

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Set your Vimeo API access token
const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;

// Function to fetch video data from Vimeo
async function getVideoDataFromVimeo(videoId: string): Promise<Partial<Video> | null> {
  try {
    // Make a request to the Vimeo API to get video data
    const response: any = await axios.get(
      `https://api.vimeo.com/videos/${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
      }
    );

    const videoData = response.data;

    // Parse the video data and create frontmatter
    const frontmatter: Partial<Video> = {
      title: videoData.name,
      description: videoData.description || "",
      thumbnails: {
        // You may need to map Vimeo thumbnails to the same structure as YouTube
        high: {
          url: videoData.pictures.sizes[2].link,
        },
      },
      videoUrl: `https://vimeo.com/${videoId}`,
      publishedAt: videoData.created_time,
      duration: "", // You may need to calculate duration based on Vimeo data
    };

    return frontmatter;
  } catch (error: any) {
    console.error(
      `Error retrieving Vimeo video data for video ${videoId}:`,
      error.message
    );
    return null;
  }
}

module.exports = {
  getVideoDataFromVimeo,
};
