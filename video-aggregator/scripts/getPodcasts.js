require("dotenv").config();
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const TurndownService = require('turndown');
const {
  getPodcastByFeedUrl,
  searchPodcastByTitle,
  getTrendingPodcasts,
} = require("./podcast");

const sourcesData = require(path.join(__dirname, "../data/podcast-sources.json"));
const podcastsToIgnore = require(path.join(__dirname, "../data/podcast-ignore.json"));
const outputFilename = path.join(__dirname, "../data/podcast/episodes.json");
const showsOutputFilename = path.join(__dirname, "../data/podcast/shows.json");
const outputDir = path.join(__dirname, "../../src/content/podcast/");
const showsDir = path.join(__dirname, "../../src/content/show/");

// Initialize Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```'
});

// Optional: Add custom rules for better conversion
turndownService.addRule('removeEmptyParagraphs', {
  filter: function (node) {
    return node.nodeName === 'P' && node.innerHTML.trim() === '';
  },
  replacement: function () {
    return '';
  }
});

// Load previously imported data
let importedPodcastData = [];
let importedShowsData = [];

if (fs.existsSync(outputFilename)) {
  importedPodcastData = JSON.parse(fs.readFileSync(outputFilename, "utf-8"));
}

if (fs.existsSync(showsOutputFilename)) {
  importedShowsData = JSON.parse(fs.readFileSync(showsOutputFilename, "utf-8"));
}

// Function to convert HTML description to clean markdown
function convertDescriptionToMarkdown(htmlDescription) {
  if (!htmlDescription || typeof htmlDescription !== 'string') {
    return '';
  }
  
  try {
    // Convert HTML to markdown
    let markdown = turndownService.turndown(htmlDescription);
    
    // Clean up common issues
    markdown = markdown
      // Remove excessive line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Clean up any remaining HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Trim whitespace
      .trim();
    
    return markdown;
  } catch (error) {
    console.warn('Error converting HTML to markdown:', error.message);
    // Fallback: strip HTML tags and return plain text
    return htmlDescription.replace(/<[^>]*>/g, '').trim();
  }
}

// Function to generate show slug from title
function generateShowSlug(title) {
  return slugify(title, { 
    lower: true, 
    remove: /[*+~.()'"!?:@,;\[\]]/g 
  }).substring(0, 50); // Limit length
}

// Function to create or update show data
function createOrUpdateShow(feedData, existingShows) {
  const showSlug = generateShowSlug(feedData.title);
  
  // First check by ID (most reliable)
  if (feedData.id) {
    const existingShowById = existingShows.find(show => show.id === feedData.id);
    if (existingShowById) {
      console.log(`Show already exists (by ID): ${feedData.title} (ID: ${feedData.id})`);
      return existingShowById;
    }
  }
  
  // Fallback: Check by feedUrl or slug
  const existingShow = existingShows.find(show => 
    show.feedUrl === feedData.url || show.slug === showSlug
  );
  
  if (existingShow) {
    console.log(`Show already exists (by feedUrl/slug): ${feedData.title}`);
    return existingShow;
  }

  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];

  const showData = {
    id: feedData.id,
    slug: showSlug,
    title: feedData.title || '',
    description: convertDescriptionToMarkdown(feedData.description || ''),
    speakers: feedData.author || feedData.ownerName || '',
    feedUrl: feedData.url || '',
    websiteUrl: feedData.link || '',
    imageUrl: feedData.artwork || feedData.image || '',
    categories: feedData.categories ? Object.values(feedData.categories) : [],
    language: feedData.language || 'en',
    explicit: feedData.explicit || false,
    episodeCount: feedData.episodeCount || 0,
    lastUpdate: new Date(feedData.lastUpdateTime * 1000).toISOString(),
    dateAdded: formattedDate,
    itunesId: feedData.itunesId || null,
    guid: feedData.podcastGuid || '',
    funding: feedData.funding || null,
    value: feedData.value || null,
    medium: feedData.medium || 'podcast',
    dead: feedData.dead || 0,
    locked: feedData.locked || 0
  };

  console.log(`Creating new show: ${showData.title} (ID: ${showData.id})`);
  return showData;
}

// Function to generate show MDX file
function generateShowMdxFile(showData, showsDir) {
  const folderPath = path.join(showsDir, showData.slug);
  const indexPath = path.join(folderPath, "index.mdx");

  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Skip if index.mdx file already exists
  if (fs.existsSync(indexPath)) {
    return;
  }

  // Format categories array for YAML
  const categoriesYaml = showData.categories.length > 0 
    ? showData.categories.map(cat => `"${cat}"`).join(', ')
    : '"Uncategorized"';

    
  // Write the frontmatter and description to the index.mdx file
  fs.writeFileSync(
    indexPath,
    `---
title: "${showData.title}"
description: "${showData.description.replace(/"/g, '\\"')}"
speakers: [${showData.speakers}]
feedUrl: "${showData.feedUrl}"
websiteUrl: "${showData.websiteUrl}"
imageReference: "${showData.imageUrl}"
image: "${showData.imageUrl}"
dateAdded: "${showData.dateAdded}"
lastUpdate: "${showData.lastUpdate}"
categories: [${categoriesYaml}]
language: "${showData.language}"
explicit: ${showData.explicit}
episodeCount: ${showData.episodeCount}
localImages: false
itunesId: ${showData.itunesId}
guid: "${showData.guid}"
medium: "${showData.medium}"
dead: ${showData.dead}
locked: ${showData.locked}
type: "show"
draft: false
---

${showData.description}
`
  );

  console.log(`Created show: ${showData.title}`);
}

// Function to generate an MDX file with podcast episode data
function generateEpisodeMdxFile(episode, showSlug, folderPath, predefinedSpeakers = null, showData = null) {
  const episodeTitle = episode.title;
  const episodeUrl = episode.episodeUrl;
  const audioUrl = episode.audioUrl;
  
  // Convert HTML description to markdown
  const episodeDescription = convertDescriptionToMarkdown(episode.description);
  
  const podcastTitle = episode.podcastTitle;

  // Use predefined speakers if available, otherwise fall back to podcast title
  const speakers = predefinedSpeakers && predefinedSpeakers.length > 0 
    ? predefinedSpeakers 
    : [podcastTitle || ""];

  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];

  // Define the file path for the index.mdx file
  const indexPath = path.join(folderPath, "index.mdx");

  // Create a folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Skip if index.mdx file already exists
  if (fs.existsSync(indexPath)) {
    return;
  }

  // Format speakers array for YAML
  const speakersYaml = speakers.map(speaker => `"${speaker}"`).join(', ');

  // Determine image to use - check for duplicates with show image
  let imageReference = null;
  
  if (episode.episodeImageUrl) {
    // If showData is provided, check against show's imageReference
    if (showData && showData.imageUrl === episode.episodeImageUrl) {
      // Episode image is same as show image, set to null to reference show's image
      imageReference = null;
    } else if (episode.episodeImageUrl !== episode.podcastImageUrl) {
      // Episode has a different image from both show and podcast default
      imageReference = `"${episode.episodeImageUrl}"`;
    } else {
      // Episode image is same as podcast image, set to null
      imageReference = null;
    }
  }
  // Write the frontmatter and description to the index.mdx file
  fs.writeFileSync(
    indexPath,
    `---
title: "${episodeTitle}"
publishedAt: "${episode.publishedAt}"
dateAdded: "${formattedDate}"
episodeUrl: "${episodeUrl}"
audioUrl: "${audioUrl}"
podcastTitle: "${podcastTitle}"
showSlug: "${showSlug}"
image: ${imageReference || 'null'}
localImages: false
tags: []
categories: ["Podcast"]
duration: "${episode.duration}"
durationSeconds: ${episode.durationSeconds}
draft: false
speakers: [${speakersYaml}]
type: "podcast"
season: ${episode.season || 'null'}
episode: ${episode.episode || 'null'}
explicit: ${episode.explicit}
feedUrl: "${episode.feedUrl}"
guid: "${episode.guid}"
hasEpisodeImage: ${Boolean(episode.episodeImageUrl && episode.episodeImageUrl !== episode.podcastImageUrl && (!showData || showData.imageUrl !== episode.episodeImageUrl))}
---
${episodeDescription}
`
  );

  console.log(`Created episode: ${episodeTitle}`);
}

// Helper function to find show data by slug
function findShowBySlug(showSlug, showsData) {
  if (!showSlug || !showsData || !Array.isArray(showsData)) {
    return null;
  }
  
  return showsData.find(show => show && show.slug === showSlug) || null;
}

// Function to retrieve an appropriate poster URL
function getPosterUrl(thumbnails) {
  if (thumbnails.maxres && thumbnails.maxres.url) {
    return thumbnails.maxres.url;
  } else if (thumbnails.high && thumbnails.high.url) {
    return thumbnails.high.url;
  } else {
    return "";
  }
}

// Helper function to remove duplicates from shows array based on ID
function removeDuplicateShows(shows) {
  const seenIds = new Set();
  const uniqueShows = [];
  
  for (const show of shows) {
    if (show.id && seenIds.has(show.id)) {
      console.log(`Removing duplicate show: ${show.title} (ID: ${show.id})`);
      continue;
    }
    
    if (show.id) {
      seenIds.add(show.id);
    }
    uniqueShows.push(show);
  }
  
  return uniqueShows;
}

// Main function to retrieve podcast data and generate output files
async function main() {
  try {
    console.log("Start: Gathering podcast data... 🎙️");

    const allEpisodes = [];
    const allShows = [];
    const feedDataCollection = []; // Store feed data for episode processing
    let ignoredEpisodesCount = 0;

    // PHASE 1: Process all shows first
    console.log("Phase 1: Processing shows...");
    
    for (const source of sourcesData) {
      let feedData = null;
      
      if (source.type === "podcast-feed") {
        const feedUrl = source.url;
        console.log(`Fetching show data from feed ${feedUrl}...`);
        const { episodes: feedEpisodes, showData } = await getPodcastByFeedUrl(feedUrl, importedPodcastData);
        feedData = { episodes: feedEpisodes, showData, source };
      } else if (source.type === "podcast-search") {
        const searchTerm = source.term;
        console.log(`Searching for podcast: ${searchTerm}...`);
        const { episodes: searchEpisodes, showData } = await searchPodcastByTitle(searchTerm, importedPodcastData);
        feedData = { episodes: searchEpisodes, showData, source };
      } else if (source.type === "trending") {
        console.log(`Fetching trending podcasts...`);
        const trendingData = await getTrendingPodcasts(importedPodcastData, source.max || 10);
        
        // Handle multiple shows from trending
        for (const trendingItem of trendingData) {
          feedDataCollection.push({ 
            episodes: trendingItem.episodes, 
            showData: trendingItem.showData, 
            source 
          });
          
          // Create show - check against both imported and newly created shows
          const show = createOrUpdateShow(trendingItem.showData, [...importedShowsData, ...allShows]);
          const showExists = allShows.find(s => s.id === show.id || s.slug === show.slug);
          if (!showExists) {
            allShows.push(show);
            generateShowMdxFile(show, showsDir);
          }
        }
        continue; // Skip the single feedData processing below
      }
      
      if (feedData) {
        feedDataCollection.push(feedData);
        
        // Create or update show - check against both imported and newly created shows
        const show = createOrUpdateShow(feedData.showData, [...importedShowsData, ...allShows]);
        const showExists = allShows.find(s => s.id === show.id || s.slug === show.slug);
        if (!showExists) {
          allShows.push(show);
          generateShowMdxFile(show, showsDir);
        }
      }
    }

    // PHASE 2: Process all episodes with access to all shows
    console.log("Phase 2: Processing episodes...");
    
    // Combine imported shows with newly created shows for episode processing
    const combinedShowsForEpisodes = [...importedShowsData, ...allShows];
    
    for (const feedData of feedDataCollection) {
      const { episodes, showData, source } = feedData;
      
      // Find the show that was created in Phase 1
      const show = combinedShowsForEpisodes.find(s => 
        s.feedUrl === showData.url || s.slug === generateShowSlug(showData.title) || s.id === showData.id
      );
      
      if (!show) {
        console.warn(`Could not find show for episodes from ${showData.title}`);
        continue;
      }

      for (const episode of episodes) {
        const episodeUrl = episode.episodeUrl;

        const sanitizedTitle = episode.title.replace(
          /[:"""#'''!?@_^%()]/gi,
          ""
        );
        const folderName = slugify(sanitizedTitle, {
          lower: true,
          remove: /[*+~.()'"!:@,;\[\]]/g,
        })
          .split("-")
          .slice(0, 7)
          .join("-");
        const folderPath = path.join(outputDir, folderName);

        // Check if the episode should be ignored
        if (podcastsToIgnore.includes(episodeUrl) || podcastsToIgnore.includes(episode.guid)) {
          console.log(`Skipping episode: ${sanitizedTitle} (ignored)`);
          ignoredEpisodesCount++;
          continue;
        }

        // Now we can find the show data because all shows have been processed
        const showSlug = episode.showSlug || show.slug;
        const showDataForEpisode = findShowBySlug(showSlug, combinedShowsForEpisodes);
        
        generateEpisodeMdxFile(episode, show.slug, folderPath, source.speakers, showDataForEpisode);
        allEpisodes.push(episode);
      }
    }

    // Combine existing data with newly fetched data
    const combinedPodcastData = [...importedPodcastData, ...allEpisodes];
    const rawCombinedShowsData = [...importedShowsData, ...allShows];

    // Remove duplicates from shows based on ID
    const combinedShowsData = removeDuplicateShows(rawCombinedShowsData);

    // Calculate the number of episodes and shows added
    const episodesAdded = allEpisodes.length;
    const showsAdded = allShows.length;
    const duplicatesRemoved = rawCombinedShowsData.length - combinedShowsData.length;

    // Sort episodes by publish date in descending order
    combinedPodcastData.sort((a, b) => {
      const dateA = new Date(a.publishedAt);
      const dateB = new Date(b.publishedAt);
      return dateB - dateA;
    });

    // Sort shows by title
    combinedShowsData.sort((a, b) => a.title.localeCompare(b.title));

    // Write the combined data to output files
    fs.writeFileSync(
      outputFilename,
      JSON.stringify(combinedPodcastData, null, 2)
    );

    fs.writeFileSync(
      showsOutputFilename,
      JSON.stringify(combinedShowsData, null, 2)
    );

    // Calculate the new totals
    const newTotalEpisodes = combinedPodcastData.length;
    const newTotalShows = combinedShowsData.length;

    console.log(`Podcast data written to ${outputFilename}`);
    console.log(`Shows data written to ${showsOutputFilename}`);
    console.log(`Episodes added: ${episodesAdded}`);
    console.log(`Shows added: ${showsAdded}`);
    console.log(`Duplicate shows removed: ${duplicatesRemoved}`);
    console.log(`Ignored episodes: ${ignoredEpisodesCount}`);
    console.log(`New total of episodes: ${newTotalEpisodes}`);
    console.log(`New total of shows: ${newTotalShows}`);
    console.log("End: Gathering podcast data. ✅");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Call the main function to start retrieving data
main();
