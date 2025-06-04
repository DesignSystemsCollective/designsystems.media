require("dotenv").config();
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const {
  getPodcastByFeedUrl,
  searchPodcastByTitle,
  getTrendingPodcasts,
} = require("./podcast");

const sourcesData = require(path.join(__dirname, "../data/podcast-sources.json"));
const podcastsToIgnore = require(path.join(__dirname, "../data/podcast-ignore.json"));
const outputFilename = path.join(__dirname, "../data/podcast-output.json");
const outputDir = path.join(__dirname, "../../src/content/podcasts/");

// Load previously imported podcast data from output.json if it exists
let importedPodcastData = [];

if (fs.existsSync(outputFilename)) {
  importedPodcastData = JSON.parse(fs.readFileSync(outputFilename, "utf-8"));
}

// Function to generate an MDX file with podcast data
function generateMdxFile(episode, folderPath, predefinedSpeakers = null) {
  const thumbnailUrl = episode.thumbnails.high.url;
  const posterUrl = getPosterUrl(episode.thumbnails);

  const episodeTitle = episode.title;
  const episodeUrl = episode.episodeUrl;
  const audioUrl = episode.audioUrl;
  const episodeDescription = episode.description;
  const podcastTitle = episode.podcastTitle;

  // Use predefined speakers if available, otherwise fall back to podcast title
  const speakers = predefinedSpeakers && predefinedSpeakers.length > 0 
    ? predefinedSpeakers 
    : [podcastTitle || "Unsorted"];

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  // Define a function to remove special characters from a string
  function removeSpecialCharacters(str) {
    return str
      .replace(/[^\w\s-:"#]/g, "")
      .replace(/[\s-:"#]+/g, "-")
      .trim();
  }

  // Remove characters like :, ", and # from the title
  const sanitizedTitle = episodeTitle.replace(/[:"#]/g, "");

  // Generate a folder name without special characters
  const folderName = removeSpecialCharacters(
    slugify(sanitizedTitle, { lower: true, remove: /[*+~.()'"!:@,;\[\]]/g })
  )
    .split("-")
    .slice(0, 5)
    .join("-");

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

  // Write the frontmatter and description to the index.mdx file
  fs.writeFileSync(
    indexPath,
    `---
title: "${episodeTitle}"
publishedAt: "${episode.publishedAt}"
image: "${thumbnailUrl}"
dateAdded: "${formattedDate}"
poster: "${posterUrl}"
episodeUrl: "${episodeUrl}"
audioUrl: "${audioUrl}"
podcastTitle: "${podcastTitle}"
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
---
${episodeDescription}\n`
  );

  console.log(`Created folder and index.mdx file for ${sanitizedTitle}`);
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
  // Load previously imported podcast data from output.json if it exists
  let importedPodcastData = [];

  if (fs.existsSync(outputFilename)) {
    importedPodcastData = JSON.parse(fs.readFileSync(outputFilename, "utf-8"));
  }

  try {
    console.log("Start: Gathering podcast data... 🎙️");

    const allEpisodes = [];
    let ignoredEpisodesCount = 0;

    for (const source of sourcesData) {
      if (source.type === "podcast-feed") {
        const feedUrl = source.url;
        console.log(`Fetching episodes from feed ${feedUrl}...`);
        const feedEpisodes = await getPodcastByFeedUrl(feedUrl, importedPodcastData);

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

          generateMdxFile(episode, folderPath, source.speakers);
          allEpisodes.push(episode);
        }
      } else if (source.type === "podcast-search") {
        const searchTerm = source.term;
        console.log(`Searching for podcast: ${searchTerm}...`);
        const searchEpisodes = await searchPodcastByTitle(searchTerm, importedPodcastData);

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

          generateMdxFile(episode, folderPath, source.speakers);
          allEpisodes.push(episode);
        }
      } else if (source.type === "trending") {
        console.log(`Fetching trending podcasts...`);
        const trendingEpisodes = await getTrendingPodcasts(importedPodcastData, source.max || 10);

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

          generateMdxFile(episode, folderPath, source.speakers);
          allEpisodes.push(episode);
        }
      }
    }

    // Combine existing data with newly fetched data
    const combinedPodcastData = [...importedPodcastData, ...allEpisodes];

    // Calculate the number of episodes added
    const episodesAdded = allEpisodes.length;

    // Sort episodes by publish date in descending order
    combinedPodcastData.sort((a, b) => {
      const dateA = new Date(a.publishedAt);
      const dateB = new Date(b.publishedAt);
      return dateB - dateA;
    });

    // Write the combined podcast data to output.json
    fs.writeFileSync(
      outputFilename,
      JSON.stringify(combinedPodcastData, null, 2)
    );

    // Calculate the new total of episodes
    const newTotalEpisodes = combinedPodcastData.length;

    console.log(`Podcast data written to ${outputFilename}`);
    console.log(`Episodes added: ${episodesAdded}`);
    console.log(`Ignored episodes: ${ignoredEpisodesCount}`);
    console.log(`New total of episodes: ${newTotalEpisodes}`);
    console.log("End: Gathering podcast data. ✅");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Call the main function to start retrieving data
main();