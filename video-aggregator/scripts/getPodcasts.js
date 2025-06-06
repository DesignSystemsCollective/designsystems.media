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
const outputFilename = path.join(__dirname, "../data/podcast-episodes.json");
const showsOutputFilename = path.join(__dirname, "../data/podcast-shows.json");
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
    remove: /[*+~.()'"!:@,;\[\]]/g 
  }).substring(0, 50); // Limit length
}

// Function to create or update show data
function createOrUpdateShow(feedData, existingShows) {
  const showSlug = generateShowSlug(feedData.title);
  
  // Check if show already exists
  const existingShow = existingShows.find(show => 
    show.feedUrl === feedData.url || show.slug === showSlug
  );
  
  if (existingShow) {
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
speakers: "${showData.author}"
feedUrl: "${showData.feedUrl}"
websiteUrl: "${showData.websiteUrl}"
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
function generateEpisodeMdxFile(episode, showSlug, folderPath, predefinedSpeakers = null) {
  const episodeTitle = episode.title;
  const episodeUrl = episode.episodeUrl;
  const audioUrl = episode.audioUrl;
  
  // Convert HTML description to markdown
  const episodeDescription = convertDescriptionToMarkdown(episode.description);
  
  const podcastTitle = episode.podcastTitle;

  // Use predefined speakers if available, otherwise fall back to podcast title
  const speakers = predefinedSpeakers && predefinedSpeakers.length > 0 
    ? predefinedSpeakers 
    : [podcastTitle || "Unsorted"];

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

  // Determine image to use - episode specific or show reference
  const imageReference = episode.episodeImageUrl && episode.episodeImageUrl !== episode.podcastImageUrl
    ? episode.episodeImageUrl  // Use episode-specific image URL
    : `../show/${showSlug}/poster.jpg`;  // Reference show's local image

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
localImages: false
tags: ["Unsorted"]
categories: ["Podcast"]
duration: "${episode.duration}"
durationSeconds: ${episode.durationSeconds}
draft: true
speakers: [${speakersYaml}]
type: "podcast"
season: ${episode.season || 'null'}
episode: ${episode.episode || 'null'}
explicit: ${episode.explicit}
feedUrl: "${episode.feedUrl}"
guid: "${episode.guid}"
hasEpisodeImage: ${episode.episodeImageUrl && episode.episodeImageUrl !== episode.podcastImageUrl}
---
${episodeDescription}
`
  );

  console.log(`Created episode: ${episodeTitle}`);
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

// Main function to retrieve podcast data and generate output files
async function main() {
  try {
    console.log("Start: Gathering podcast data... 🎙️");

    const allEpisodes = [];
    const allShows = [];
    let ignoredEpisodesCount = 0;

    for (const source of sourcesData) {
      if (source.type === "podcast-feed") {
        const feedUrl = source.url;
        console.log(`Fetching episodes from feed ${feedUrl}...`);
        const { episodes: feedEpisodes, showData } = await getPodcastByFeedUrl(feedUrl, importedPodcastData);

        // Create or update show
        const show = createOrUpdateShow(showData, importedShowsData);
        const showExists = allShows.find(s => s.slug === show.slug);
        if (!showExists) {
          allShows.push(show);
          generateShowMdxFile(show, showsDir);
        }

        for (const episode of feedEpisodes) {
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

          generateEpisodeMdxFile(episode, show.slug, folderPath, source.speakers);
          allEpisodes.push(episode);
        }
      } else if (source.type === "podcast-search") {
        const searchTerm = source.term;
        console.log(`Searching for podcast: ${searchTerm}...`);
        const { episodes: searchEpisodes, showData } = await searchPodcastByTitle(searchTerm, importedPodcastData);

        // Create or update show
        const show = createOrUpdateShow(showData, importedShowsData);
        const showExists = allShows.find(s => s.slug === show.slug);
        if (!showExists) {
          allShows.push(show);
          generateShowMdxFile(show, showsDir);
        }

        for (const episode of searchEpisodes) {
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

          generateEpisodeMdxFile(episode, show.slug, folderPath, source.speakers);
          allEpisodes.push(episode);
        }
      } else if (source.type === "trending") {
        console.log(`Fetching trending podcasts...`);
        const trendingData = await getTrendingPodcasts(importedPodcastData, source.max || 10);

        for (const { episodes: trendingEpisodes, showData } of trendingData) {
          // Create or update show
          const show = createOrUpdateShow(showData, importedShowsData);
          const showExists = allShows.find(s => s.slug === show.slug);
          if (!showExists) {
            allShows.push(show);
            generateShowMdxFile(show, showsDir);
          }

          for (const episode of trendingEpisodes) {
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

            generateEpisodeMdxFile(episode, show.slug, folderPath, source.speakers);
            allEpisodes.push(episode);
          }
        }
      }
    }

    // Combine existing data with newly fetched data
    const combinedPodcastData = [...importedPodcastData, ...allEpisodes];
    const combinedShowsData = [...importedShowsData, ...allShows];

    // Calculate the number of episodes and shows added
    const episodesAdded = allEpisodes.length;
    const showsAdded = allShows.length;

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