// podcast.ts
//
// Converted to TypeScript in Phase 4 - see the accompanying ADR. Function
// signatures and the constructed episode objects are typed against the
// shared Episode/PodcastFetchResult types in ./types.ts. Raw Podcast Index
// API response traversal (`feed`, `episode`, `response.data`) is
// deliberately left as `any` - same reasoning as youtube.ts.

import type { Episode, PodcastFetchResult } from "./types";

const he = require("he");
const axios = require("axios");
const crypto = require('crypto'); // Ensure crypto is imported here
const { formatSecondsAsDuration } = require("./shared.ts");

// Podcast Index API credentials (you'll need to get these from https://podcastindex.org/)
// Asserted as string rather than left `string | undefined`: these are
// required config, and casting (not defaulting to "") preserves the exact
// existing runtime behavior if they're ever actually missing - a defaulted
// empty string would change what gets hashed into the auth header, an
// assertion doesn't change the value at all, just how TS treats its type.
const API_KEY = process.env.PODCAST_API_KEY as string;
const API_SECRET = process.env.PODCAST_API_SECRET as string;

// Function to replace plain quotes with fancy quotes
function replaceQuotesWithFancyQuotes(title: string): string {
  const fancyTitle = title.replace(/"/g, "“").replace(/"/g, "”");
  return fancyTitle;
}

// Thin wrapper kept under its original name so nothing importing
// podcast.js's public API has to change. As of Phase 3 this delegates to
// shared.js's canonical formatter instead of its own copy - see ADR 0004.
// Parameter stays `unknown`, not `number`: this wrapper is documented (see
// its own test, "still does no type-checking on its input") to pass
// through whatever it's given without validating it first.
function formatDuration(durationInSeconds: unknown): string {
  return formatSecondsAsDuration(durationInSeconds);
}

// Function to get podcast artwork URL (already good, but keeping for completeness)
function getPodcastArtwork(feed: any): string {
  // Try to get the highest quality artwork available
  if (feed.artwork) {
    return feed.artwork;
  } else if (feed.image) {
    return feed.image;
  }
  return "";
}

// Function to generate podcast API headers with debugging
function generateApiHeaders(): Record<string, string> {
  const apiHeaderTime = Math.floor(Date.now() / 1000);

  const sha1Algorithm = "sha1";
  const sha1Hash = crypto.createHash(sha1Algorithm);
  const data4Hash = API_KEY + API_SECRET + apiHeaderTime;
  sha1Hash.update(data4Hash);
  const hash4Header = sha1Hash.digest('hex');

  // Add debugging
  // console.log('API Headers Debug:');
  // console.log('Timestamp:', apiHeaderTime);
  // console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 8)}...` : 'MISSING');
  // console.log('Hash:', hash4Header.substring(0, 16) + '...');

  const headers = {
    'X-Auth-Date': apiHeaderTime.toString(),
    'X-Auth-Key': API_KEY,
    'Authorization': hash4Header,
    'User-Agent': 'PodcastAggregator/1.0'
  };

  return headers;
}

// Function to search for podcasts by feed URL
async function getPodcastByFeedUrl(
  feedUrl: string,
  importedPodcastData: Episode[] = [],
): Promise<PodcastFetchResult> {
  try {
    const headers = generateApiHeaders();

    const response: any = await axios.get('https://api.podcastindex.org/api/1.0/podcasts/byfeedurl', {
      headers,
      params: {
        url: feedUrl
      }
    });

    if (response.data && response.data.feed) {
      const feed = response.data.feed;
      const episodes = await getEpisodesFromFeed(feed.id, importedPodcastData, feed);

      return {
        episodes: episodes,
        showData: feed
      };
    }

    return { episodes: [], showData: null };
  } catch (error: any) {
    console.error(`Error retrieving podcast by feed URL ${feedUrl}:`, error.message);
    return { episodes: [], showData: null };
  }
}

// Function to get all episodes from a podcast feed
async function getEpisodesFromFeed(
  feedId: unknown,
  importedPodcastData: Episode[] = [],
  feedInfo: any = null,
): Promise<Episode[]> {
  try {
    const episodes: Episode[] = [];
    const headers = generateApiHeaders();

    // Get episodes from the feed
    const response: any = await axios.get('https://api.podcastindex.org/api/1.0/episodes/byfeedid', {
      headers,
      params: {
        id: feedId,
        max: 1000, // Adjust as needed
        fulltext: true
      }
    });

    if (response.data && response.data.items) {
      const podcastMainImageUrl = getPodcastArtwork(feedInfo); // Get the main podcast artwork once

      for (const episode of response.data.items) {
        const episodeUrl = episode.enclosureUrl || episode.link;

        // Check if episode has already been imported
        if (importedPodcastData.some(pod => pod.episodeUrl === episodeUrl)) {
          continue;
        }

        // Skip episodes shorter than 2 minutes (120 seconds)
        if (episode.duration && episode.duration < 120) {
          continue;
        }

        // Determine the episode's image URL, falling back to the podcast's main image
        const episodeSpecificImageUrl = episode.image || null; // This is the image specific to the episode
        const finalEpisodeImageUrl = episodeSpecificImageUrl || podcastMainImageUrl; // Fallback logic for the 'image' field

        const episodeData: Episode = {
          title: replaceQuotesWithFancyQuotes(he.decode(episode.title || '')),
          description: episode.description || '',
          podcastTitle: feedInfo ? feedInfo.title : episode.feedTitle || '',
          episodeUrl: episodeUrl,
          audioUrl: episode.enclosureUrl || '',
          publishedAt: new Date(episode.datePublished * 1000).toISOString(),
          duration: formatDuration(episode.duration || 0),
          durationSeconds: episode.duration || 0,
          // New image fields for explicit handling
          episodeImageUrl: episodeSpecificImageUrl, // Only episode-specific image or null
          podcastImageUrl: podcastMainImageUrl, // Always the main podcast artwork
          thumbnails: { // Keeping existing structure for compatibility if other parts of your code use it
            high: { url: finalEpisodeImageUrl },
            maxres: { url: podcastMainImageUrl || finalEpisodeImageUrl } // maxres usually points to the best quality, which is often the podcast art
          },
          feedUrl: feedInfo ? feedInfo.url : '',
          feedId: feedId,
          episodeId: episode.id,
          guid: episode.guid || '',
          season: episode.season || null,
          episode: episode.episode || null,
          explicit: episode.explicit || false,
          type: episode.episodeType || 'full'
        };

        episodes.push(episodeData);
      }
    }

    return episodes;
  } catch (error: any) {
    console.error(`Error retrieving episodes for feed ${feedId}:`, error.message);
    return [];
  }
}

// Function to search for podcasts by title
async function searchPodcastByTitle(
  title: string,
  importedPodcastData: Episode[] = [],
): Promise<PodcastFetchResult> {
  try {
    const headers = generateApiHeaders();

    const response: any = await axios.get('https://api.podcastindex.org/api/1.0/search/byterm', {
      headers,
      params: {
        q: title,
        max: 10,
        clean: true
      }
    });

    if (response.data && response.data.feeds && response.data.feeds.length > 0) {
      // Get the first (most relevant) podcast
      const feed = response.data.feeds[0];
      const episodes = await getEpisodesFromFeed(feed.id, importedPodcastData, feed);

      return {
        episodes: episodes,
        showData: feed
      };
    }

    return { episodes: [], showData: null };
  } catch (error: any) {
    console.error(`Error searching for podcast "${title}":`, error.message);
    return { episodes: [], showData: null };
  }
}

// Function to get trending podcasts
async function getTrendingPodcasts(
  importedPodcastData: Episode[] = [],
  max: number = 10,
): Promise<PodcastFetchResult[]> {
  try {
    const headers = generateApiHeaders();

    const response: any = await axios.get('https://api.podcastindex.org/api/1.0/podcasts/trending', {
      headers,
      params: {
        max: max,
        lang: 'en'
      }
    });

    const allPodcastData: PodcastFetchResult[] = [];

    if (response.data && response.data.feeds) {
      for (const feed of response.data.feeds) {
        const episodes = await getEpisodesFromFeed(feed.id, importedPodcastData, feed);
        allPodcastData.push({
          episodes: episodes,
          showData: feed
        });
      }
    }

    return allPodcastData;
  } catch (error: any) {
    console.error('Error retrieving trending podcasts:', error.message);
    return [];
  }
}

module.exports = {
  getPodcastByFeedUrl,
  getEpisodesFromFeed,
  searchPodcastByTitle,
  getTrendingPodcasts,
  getPodcastArtwork,
  formatDuration
};
