// youtube.ts
//
// Converted to TypeScript in Phase 4 - see the accompanying ADR. Function
// signatures and the constructed `Video` objects are typed against the
// shared Video/VideoThumbnails types in ./types.ts (replacing the ad hoc
// inline object shapes this file used to build by hand). Raw YouTube Data
// API response traversal (`item`, `response.data`, `contentDetails`, etc.)
// is deliberately left as `any` rather than modeled against googleapis'
// own response types - those are deeply nested and only partially used
// here, and typing them precisely is a separate, larger undertaking than
// this conversion pass is scoped to. What matters for catching real bugs
// is that the *output* of this file (the Video objects it builds and
// hands to getVideos.js) is properly typed, which it now is.

import type { Video } from "./types";

const he = require("he");
const { google } = require("googleapis");
const {
  getPosterUrl,
  parseISO8601DurationToSeconds,
  formatSecondsAsDuration,
} = require("./shared.ts");

// Initialize the YouTube Data API client
const youtube = google.youtube("v3");

// Set your YouTube API key or OAuth 2.0 credentials
const API_KEY = process.env.API_KEY;

// Function to replace plain quotes with fancy quotes
function replaceQuotesWithFancyQuotes(title: string): string {
  // Replace straight quotes with fancy quotes
  const fancyTitle = title.replace(/"/g, "“").replace(/"/g, "”");
  return fancyTitle;
}

// Thin wrappers kept under their original names so nothing importing
// youtube.js's public API has to change. As of Phase 3 both delegate to
// shared.js's canonical parser/formatter instead of each maintaining an
// independent ISO 8601 parse - see ADR 0004.
function calculateTotalSeconds(rawDuration: unknown): number {
  return parseISO8601DurationToSeconds(rawDuration);
}

function formatDuration(rawDuration: unknown): string {
  return formatSecondsAsDuration(parseISO8601DurationToSeconds(rawDuration));
}

// Computes both the display string and canonical seconds for a video's raw
// ISO 8601 duration in one place - previously this same block (format +
// calculate + shorts check) was copy-pasted between
// getAllVideosFromChannel and getAllVideosFromPlaylist below.
function applyDuration(videoData: Video, rawDuration: unknown): number {
  const durationSeconds = parseISO8601DurationToSeconds(rawDuration);
  videoData.duration = formatSecondsAsDuration(durationSeconds);
  videoData.durationSeconds = durationSeconds;
  return durationSeconds;
}

// Function to retrieve all video data from a channel
async function getAllVideosFromChannel(
  channelId: string,
  importedVideoData: Video[],
): Promise<Video[]> {
  try {
    const videos: Video[] = [];
    let nextPageToken: string | null = null;

    do {
      const response: any = await youtube.search.list({
        // TODO: Think we can replace this with another call that uses less quota. We could pull the channels playlist IDs and then run those through the other function? https://developers.google.com/youtube/v3/docs/channels
        auth: API_KEY,
        channelId: channelId,
        maxResults: 50,
        pageToken: nextPageToken,
        order: "date",
        part: "snippet",
        type: "video",
      });

      const videoItems = response.data.items;
      nextPageToken = response.data.nextPageToken;

      if (videoItems) {
        for (const item of videoItems) {
          const videoId = item.id.videoId;

          // Check if the video ID has already been imported
          if (
            importedVideoData.some((video) => video.videoUrl.includes(videoId))
          ) {
            // console.log(`Skipping video with ID ${videoId} (already imported)`);
            continue; // Skip this video and continue to the next one
          }

          const videoData: Video = {
            title: replaceQuotesWithFancyQuotes(he.decode(item.snippet.title)),
            description: "", // Initialize description as an empty string
            thumbnails: item.snippet.thumbnails,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: item.snippet.publishedAt,
            privacyStatus: "", // Initialize duration as an empty string
            duration: "", // Initialize duration as an empty string
          };

          // Retrieve the full video description
          const videoDetailsResponse: any = await youtube.videos.list({
            auth: API_KEY,
            id: videoId,
            part: "snippet,contentDetails,status", // Include contentDetails
          });

          const videoDetails = videoDetailsResponse.data.items[0].snippet;
          const contentDetails =
            videoDetailsResponse.data.items[0].contentDetails;
          const statusDetails = videoDetailsResponse.data.items[0].status;

          if (statusDetails && statusDetails.privacyStatus) {
            videoData.privacyStatus = statusDetails.privacyStatus;
          }

          if (videoDetails && videoDetails.description) {
            videoData.description = videoDetails.description;
          }

          if (contentDetails && contentDetails.duration) {
            const totalSeconds = applyDuration(videoData, contentDetails.duration);
            // Skip Shorts (videos 60 seconds or shorter)
            if (totalSeconds <= 60) {
              continue; // Skip shorts
            }
          }

          videos.push(videoData);
        }
      }
    } while (nextPageToken);

    return videos;
  } catch (error: any) {
    console.error(
      `Error retrieving channel videos for channel ${channelId}:`,
      error.message
    );
    return [];
  }
}

// Function to retrieve all video data from a playlist
async function getAllVideosFromPlaylist(
  playlistId: string,
  importedVideoData: Video[],
): Promise<Video[]> {
  try {
    const videos: Video[] = [];
    let nextPageToken: string | null = null;

    do {
      const response: any = await youtube.playlistItems.list({
        auth: API_KEY,
        playlistId: playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
        part: "snippet,contentDetails,status",
      });

      const videoItems = response.data.items;
      nextPageToken = response.data.nextPageToken;

      if (videoItems) {
        for (const item of videoItems) {
          const videoId = item.snippet.resourceId.videoId;

          // Check if the video ID has already been imported
          // TODO - 20 October. I wonder if this could be earlier somewhere, to reduce API calls?
          if (
            importedVideoData.some((video) => video.videoUrl.includes(videoId))
          ) {
            //console.log(`Skipping video with ID ${videoId} (already imported)`);
            continue; // Skip this video and continue to the next one
          }

          const videoData: Video = {
            title: replaceQuotesWithFancyQuotes(he.decode(item.snippet.title)),
            description: "", // Initialize description as an empty string
            thumbnails: item.snippet.thumbnails,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: item.contentDetails.videoPublishedAt,
            privacyStatus: item.status.privacyStatus, // Initialize duration as an empty string
            duration: "", // Initialize duration as an empty string
          };

          // Retrieve the full video description
          const videoDetailsResponse: any = await youtube.videos.list({
            auth: API_KEY,
            id: videoId,
            part: "snippet,contentDetails",
          });

          const videoDetails = videoDetailsResponse.data.items[0].snippet;
          const contentDetails =
            videoDetailsResponse.data.items[0].contentDetails;

          if (videoDetails && videoDetails.description) {
            videoData.description = videoDetails.description;
          }
          if (contentDetails && contentDetails.duration) {
            const totalSeconds = applyDuration(videoData, contentDetails.duration);
            // Skip Shorts (videos 60 seconds or shorter)
            if (totalSeconds <= 60) {
              continue; // Skip shorts
            }
          }

          videos.push(videoData);
        }
      }
    } while (nextPageToken);

    return videos;
  } catch (error: any) {
    console.error(
      `Error retrieving playlist videos for playlist ${playlistId}:`,
      error.message
    );
    return [];
  }
}

module.exports = {
  getAllVideosFromChannel,
  getAllVideosFromPlaylist,
  getPosterUrl,
  formatDuration,
  calculateTotalSeconds,
};
