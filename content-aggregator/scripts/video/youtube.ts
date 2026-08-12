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

import type { Video } from "../shared/types";

const he = require("he");
const { google } = require("googleapis");
const {
  getPosterUrl,
  replaceQuotesWithFancyQuotes,
  parseISO8601DurationToSeconds,
  formatSecondsAsDuration,
} = require("../shared/shared.ts");

// Initialize the YouTube Data API client
const youtube = google.youtube("v3");

// Set your YouTube API key or OAuth 2.0 credentials
const API_KEY = process.env.API_KEY;

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

// Looks up a channel's "uploads" playlist ID - every channel has one
// automatically, containing every video it's ever publicly uploaded. Used
// by getAllVideosFromChannel below instead of the search endpoint. Costs 1
// quota unit, once per channel per run.
async function getUploadsPlaylistId(channelId: string): Promise<string | null> {
  const response: any = await youtube.channels.list({
    auth: API_KEY,
    id: channelId,
    part: "contentDetails",
  });

  const channel = response.data.items?.[0];
  return channel?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

// Function to retrieve all video data from a channel
//
// Previously enumerated a channel's videos via youtube.search.list, YouTube
// Data API's most expensive list endpoint at 100 quota units per page (up
// to 50 videos) - and paged through the *entire* channel history on every
// run, skipping already-imported videos one at a time rather than stopping
// early, so the cost only grew as each channel accumulated more videos.
// Every channel has a hidden "uploads" playlist containing the exact same
// videos, readable via playlistItems.list at 1 quota unit per page instead
// - a 100x reduction with no change to which videos are found. This now
// looks that playlist ID up (getUploadsPlaylistId, 1 quota unit) and
// delegates to getAllVideosFromPlaylist, reusing its pagination/dedup/Shorts
// filtering rather than duplicating it. See ADR 0017.
//
// Bonus: search.list is index-based and can lag behind a channel's actual
// upload history; the uploads playlist reflects a new upload immediately,
// so this is also more reliable, not just cheaper.
async function getAllVideosFromChannel(
  channelId: string,
  importedVideoData: Video[],
): Promise<Video[]> {
  try {
    const uploadsPlaylistId = await getUploadsPlaylistId(channelId);

    if (!uploadsPlaylistId) {
      console.error(`Could not find an uploads playlist for channel ${channelId}`);
      return [];
    }

    return await getAllVideosFromPlaylist(uploadsPlaylistId, importedVideoData);
  } catch (error: any) {
    console.error(
      `Error retrieving channel videos for channel ${channelId}:`,
      error.message
    );
    return [];
  }
}

// Fetches description+duration for up to 50 video IDs in a single
// videos.list call - it accepts a comma-separated `id` list for the same 1
// quota unit as a single-ID call, so this collapses what used to be one
// call per new video into (usually) one call per page. Chunks defensively
// at 50 even though every caller here only ever passes a single page's
// worth of IDs (already capped at 50 by playlistItems.list's maxResults).
async function fetchVideoDetailsBatch(videoIds: string[]): Promise<Map<string, any>> {
  const detailsById = new Map<string, any>();

  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const response: any = await youtube.videos.list({
      auth: API_KEY,
      id: chunk.join(","),
      part: "snippet,contentDetails",
    });

    for (const item of response.data.items ?? []) {
      detailsById.set(item.id, item);
    }
  }

  return detailsById;
}

// Function to retrieve all video data from a playlist
//
// Description/duration used to be fetched with one videos.list call per new
// video found on a page. Now every new video ID on a page is collected
// first, then fetched in one batched call via fetchVideoDetailsBatch - same
// 1 quota unit either way, just for up to 50 videos instead of 1. A video ID
// missing from the batched response (e.g. removed between the two calls)
// resolves to `undefined` via the Map lookup below rather than crashing, an
// incidental robustness improvement over the previous `items[0]` access.
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
        const candidates: Array<{ videoId: string; videoData: Video }> = [];

        for (const item of videoItems) {
          const videoId = item.snippet.resourceId.videoId;

          // Check if the video ID has already been imported
          if (
            importedVideoData.some((video) => video.videoUrl.includes(videoId))
          ) {
            //console.log(`Skipping video with ID ${videoId} (already imported)`);
            continue; // Skip this video and continue to the next one
          }

          candidates.push({
            videoId,
            videoData: {
              title: replaceQuotesWithFancyQuotes(he.decode(item.snippet.title)),
              description: "", // Initialize description as an empty string
              thumbnails: item.snippet.thumbnails,
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              publishedAt: item.contentDetails.videoPublishedAt,
              privacyStatus: item.status.privacyStatus,
              duration: "", // Initialize duration as an empty string
            },
          });
        }

        if (candidates.length > 0) {
          const detailsById = await fetchVideoDetailsBatch(candidates.map((c) => c.videoId));

          for (const { videoId, videoData } of candidates) {
            const details = detailsById.get(videoId);
            const videoDetails = details?.snippet;
            const contentDetails = details?.contentDetails;

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
  getUploadsPlaylistId,
  getPosterUrl,
  formatDuration,
  calculateTotalSeconds,
};
