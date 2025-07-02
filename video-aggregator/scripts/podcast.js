// podcast.js
const he = require("he");
const axios = require("axios");
const crypto = require('crypto'); // Ensure crypto is imported here

// Podcast Index API credentials (you'll need to get these from https://podcastindex.org/)
const API_KEY = process.env.PODCAST_API_KEY;
const API_SECRET = process.env.PODCAST_API_SECRET;

// Function to replace plain quotes with fancy quotes
function replaceQuotesWithFancyQuotes(title) {
  const fancyTitle = title.replace(/"/g, "\u201C").replace(/"/g, "\u201D");
  return fancyTitle;
}

// Function to format podcast duration (seconds to HH:MM:SS)
function formatDuration(durationInSeconds) {
  if (!durationInSeconds || durationInSeconds === 0) {
    return "0:00:00";
  }

  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = durationInSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Function to get podcast artwork URL (already good, but keeping for completeness)
function getPodcastArtwork(feed) {
  // Try to get the highest quality artwork available
  if (feed.artwork) {
    return feed.artwork;
  } else if (feed.image) {
    return feed.image;
  }
  return "";
}

// Function to generate podcast API headers
function generateApiHeaders() {
  const apiHeaderTime = Math.floor(Date.now() / 1000);

  const sha1Algorithm = "sha1";
  const sha1Hash = crypto.createHash(sha1Algorithm);
  const data4Hash = API_KEY + API_SECRET + apiHeaderTime;
  sha1Hash.update(data4Hash);
  const hash4Header = sha1Hash.digest('hex');

  return {
    'X-Auth-Date': apiHeaderTime.toString(),
    'X-Auth-Key': API_KEY,
    'Authorization': hash4Header,
    'User-Agent': 'YourAppName/1.0' // Consider using a more specific User-Agent
  };
}

// Function to search for podcasts by feed URL
async function getPodcastByFeedUrl(feedUrl, importedPodcastData = []) {
  try {
    const headers = generateApiHeaders();

    const response = await axios.get('https://api.podcastindex.org/api/1.0/podcasts/byfeedurl', {
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
  } catch (error) {
    console.error(`Error retrieving podcast by feed URL ${feedUrl}:`, error.message);
    return { episodes: [], showData: null };
  }
}

// Function to get all episodes from a podcast feed
async function getEpisodesFromFeed(feedId, importedPodcastData = [], feedInfo = null) {
  try {
    const episodes = [];
    const headers = generateApiHeaders();

    // Get episodes from the feed
    const response = await axios.get('https://api.podcastindex.org/api/1.0/episodes/byfeedid', {
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

        const episodeData = {
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
  } catch (error) {
    console.error(`Error retrieving episodes for feed ${feedId}:`, error.message);
    return [];
  }
}

// Function to search for podcasts by title
async function searchPodcastByTitle(title, importedPodcastData = []) {
  try {
    const headers = generateApiHeaders();

    const response = await axios.get('https://api.podcastindex.org/api/1.0/search/byterm', {
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
  } catch (error) {
    console.error(`Error searching for podcast "${title}":`, error.message);
    return { episodes: [], showData: null };
  }
}

// Function to get trending podcasts
async function getTrendingPodcasts(importedPodcastData = [], max = 10) {
  try {
    const headers = generateApiHeaders();

    const response = await axios.get('https://api.podcastindex.org/api/1.0/podcasts/trending', {
      headers,
      params: {
        max: max,
        lang: 'en'
      }
    });

    const allPodcastData = [];

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
  } catch (error) {
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