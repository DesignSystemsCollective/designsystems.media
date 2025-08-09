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

// Configuration
const CONFIG = {
  sources: require(path.join(__dirname, "../data/podcast-sources.json")),
  ignored: require(path.join(__dirname, "../data/podcast-ignore.json")),
  paths: {
    episodes: path.join(__dirname, "../data/podcast/episodes.json"),
    shows: path.join(__dirname, "../data/podcast/shows.json"),
    episodesDir: path.join(__dirname, "../../src/content/podcast/"),
    showsDir: path.join(__dirname, "../../src/content/show/")
  },
  slugify: {
    lower: true,
    remove: /[*+~.()'"!?:@,;\[\]]/g
  }
};

// Initialize Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```'
});

// Remove empty paragraphs during conversion
turndownService.addRule('removeEmptyParagraphs', {
  filter: node => node.nodeName === 'P' && node.innerHTML.trim() === '',
  replacement: () => ''
});

// Utility functions
const utils = {
  loadJsonFile(filepath) {
    return fs.existsSync(filepath) ? JSON.parse(fs.readFileSync(filepath, "utf-8")) : [];
  },

  convertHtmlToMarkdown(html) {
    if (!html || typeof html !== 'string') return '';
    
    try {
      return turndownService.turndown(html)
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    } catch (error) {
      console.warn('Error converting HTML to markdown:', error.message);
      return html.replace(/<[^>]*>/g, '').trim();
    }
  },

  generateSlug(title, maxLength = 50) {
    return slugify(title, CONFIG.slugify).substring(0, maxLength);
  },

  formatYamlArray(items) {
    return items.length > 0 ? items.map(item => `"${item}"`).join(', ') : '"Uncategorized"';
  },

  createDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  removeDuplicatesById(items) {
    const seenIds = new Set();
    return items.filter(item => {
      if (!item.id || seenIds.has(item.id)) {
        if (item.id && seenIds.has(item.id)) {
          console.log(`Removing duplicate: ${item.title} (ID: ${item.id})`);
        }
        return !item.id || !seenIds.has(item.id); // Keep items without IDs
      }
      seenIds.add(item.id);
      return true;
    });
  }
};

// Show management
class ShowManager {
  constructor(existingShows = []) {
    this.shows = [...existingShows];
    this.showsMap = new Map(existingShows.map(show => [show.id, show]).filter(([id]) => id));
  }

  findExisting(feedData) {
    // Check by ID first (most reliable)
    if (feedData.id && this.showsMap.has(feedData.id)) {
      return this.showsMap.get(feedData.id);
    }
    
    // Fallback: check by feedUrl or slug
    const slug = utils.generateSlug(feedData.title);
    return this.shows.find(show => 
      show.feedUrl === feedData.url || show.slug === slug
    );
  }

  createShow(feedData) {
    const existing = this.findExisting(feedData);
    if (existing) {
      console.log(`Show already exists: ${feedData.title} (ID: ${feedData.id || 'no ID'})`);
      return existing;
    }

    const show = {
      id: feedData.id,
      slug: utils.generateSlug(feedData.title),
      title: feedData.title || '',
      description: utils.convertHtmlToMarkdown(feedData.description || ''),
      speakers: feedData.author || feedData.ownerName || '',
      feedUrl: feedData.url || '',
      websiteUrl: feedData.link || '',
      imageUrl: feedData.artwork || feedData.image || '',
      categories: feedData.categories ? Object.values(feedData.categories) : [],
      language: feedData.language || 'en',
      explicit: feedData.explicit || false,
      episodeCount: feedData.episodeCount || 0,
      lastUpdate: new Date(feedData.lastUpdateTime * 1000).toISOString(),
      dateAdded: new Date().toISOString().split('T')[0],
      itunesId: feedData.itunesId || null,
      guid: feedData.podcastGuid || '',
      funding: feedData.funding || null,
      value: feedData.value || null,
      medium: feedData.medium || 'podcast',
      dead: feedData.dead || 0,
      locked: feedData.locked || 0
    };

    console.log(`Creating new show: ${show.title} (ID: ${show.id || 'no ID'})`);
    this.shows.push(show);
    
    if (show.id) {
      this.showsMap.set(show.id, show);
    }
    
    return show;
  }

  getAllShows() {
    return this.shows;
  }

  findBySlug(slug) {
    return this.shows.find(show => show.slug === slug);
  }
}

// File generators
const fileGenerators = {
  generateShowMdx(show) {
    const folderPath = path.join(CONFIG.paths.showsDir, show.slug);
    const indexPath = path.join(folderPath, "index.mdx");

    utils.createDirectory(folderPath);

    // Skip if file already exists
    if (fs.existsSync(indexPath)) return;

    const categoriesYaml = utils.formatYamlArray(show.categories);
    const content = `---
title: "${show.title}"
description: "${show.description.replace(/"/g, '\\"')}"
speakers: [${show.speakers}]
feedUrl: "${show.feedUrl}"
websiteUrl: "${show.websiteUrl}"
imageReference: "${show.imageUrl}"
image: "${show.imageUrl}"
dateAdded: "${show.dateAdded}"
lastUpdate: "${show.lastUpdate}"
categories: [${categoriesYaml}]
language: "${show.language}"
explicit: ${show.explicit}
episodeCount: ${show.episodeCount}
localImages: false
itunesId: ${show.itunesId}
guid: "${show.guid}"
medium: "${show.medium}"
dead: ${show.dead}
locked: ${show.locked}
type: "show"
draft: false
---

${show.description}
`;

    fs.writeFileSync(indexPath, content);
    console.log(`Created show: ${show.title}`);
  },

  generateEpisodeMdx(episode, showSlug, predefinedSpeakers = null, showData = null) {
    const sanitizedTitle = episode.title.replace(/[:"""#'''!?@_^%()]/gi, "");
    const folderName = utils.generateSlug(sanitizedTitle).split("-").slice(0, 7).join("-");
    const folderPath = path.join(CONFIG.paths.episodesDir, folderName);
    const indexPath = path.join(folderPath, "index.mdx");

    utils.createDirectory(folderPath);

    // Skip if file already exists
    if (fs.existsSync(indexPath)) return;

    // Determine speakers
    const speakers = predefinedSpeakers?.length > 0 
      ? predefinedSpeakers 
      : [episode.podcastTitle || ""];

    // Determine image reference
    let imageReference = null;
    if (episode.episodeImageUrl) {
      const isDifferentFromShow = !showData || showData.imageUrl !== episode.episodeImageUrl;
      const isDifferentFromPodcast = episode.episodeImageUrl !== episode.podcastImageUrl;
      
      if (isDifferentFromShow && isDifferentFromPodcast) {
        imageReference = `"${episode.episodeImageUrl}"`;
      }
    }

    const speakersYaml = utils.formatYamlArray(speakers);
    const hasEpisodeImage = Boolean(imageReference);

    const content = `---
title: "${episode.title}"
publishedAt: "${episode.publishedAt}"
dateAdded: "${new Date().toISOString().split('T')[0]}"
episodeUrl: "${episode.episodeUrl}"
audioUrl: "${episode.audioUrl}"
podcastTitle: "${episode.podcastTitle}"
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
hasEpisodeImage: ${hasEpisodeImage}
---
${utils.convertHtmlToMarkdown(episode.description)}
`;

    fs.writeFileSync(indexPath, content);
    console.log(`Created episode: ${episode.title}`);
  }
};

// Data processors
const dataProcessors = {
  async processFeedSource(source, showManager, importedEpisodes) {
    console.log(`Fetching show data from feed ${source.url}...`);
    const { episodes, showData } = await getPodcastByFeedUrl(source.url, importedEpisodes);
    const show = showManager.createShow(showData);
    fileGenerators.generateShowMdx(show);
    return { episodes, show, source };
  },

  async processSearchSource(source, showManager, importedEpisodes) {
    console.log(`Searching for podcast: ${source.term}...`);
    const { episodes, showData } = await searchPodcastByTitle(source.term, importedEpisodes);
    const show = showManager.createShow(showData);
    fileGenerators.generateShowMdx(show);
    return { episodes, show, source };
  },

  async processTrendingSource(source, showManager, importedEpisodes) {
    console.log(`Fetching trending podcasts...`);
    const trendingData = await getTrendingPodcasts(importedEpisodes, source.max || 10);
    
    const results = [];
    for (const item of trendingData) {
      const show = showManager.createShow(item.showData);
      fileGenerators.generateShowMdx(show);
      results.push({ episodes: item.episodes, show, source });
    }
    return results;
  }
};

// Main execution
async function main() {
  try {
    console.log("Start: Gathering podcast data... 🎙️");

    // Load existing data
    const importedEpisodes = utils.loadJsonFile(CONFIG.paths.episodes);
    const importedShows = utils.loadJsonFile(CONFIG.paths.shows);
    
    const showManager = new ShowManager(importedShows);
    const allEpisodes = [];
    const feedDataCollection = [];
    let ignoredEpisodesCount = 0;

    // Phase 1: Process all sources and create shows
    console.log("Phase 1: Processing shows...");
    
    for (const source of CONFIG.sources) {
      let results = [];
      
      switch (source.type) {
        case "podcast-feed":
          results = [await dataProcessors.processFeedSource(source, showManager, importedEpisodes)];
          break;
        case "podcast-search":  
          results = [await dataProcessors.processSearchSource(source, showManager, importedEpisodes)];
          break;
        case "trending":
          results = await dataProcessors.processTrendingSource(source, showManager, importedEpisodes);
          break;
      }
      
      feedDataCollection.push(...results);
    }

    // Phase 2: Process episodes
    console.log("Phase 2: Processing episodes...");
    
    for (const { episodes, show, source } of feedDataCollection) {
      for (const episode of episodes) {
        // Check if episode should be ignored
        if (CONFIG.ignored.includes(episode.episodeUrl) || CONFIG.ignored.includes(episode.guid)) {
          console.log(`Skipping episode: ${episode.title} (ignored)`);
          ignoredEpisodesCount++;
          continue;
        }

        const showData = showManager.findBySlug(show.slug);
        fileGenerators.generateEpisodeMdx(episode, show.slug, source.speakers, showData);
        allEpisodes.push(episode);
      }
    }

    // Combine and deduplicate data
    const combinedEpisodes = [...importedEpisodes, ...allEpisodes];
    const combinedShows = utils.removeDuplicatesById([...importedShows, ...showManager.getAllShows()]);

    // Sort data
    combinedEpisodes.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    combinedShows.sort((a, b) => a.title.localeCompare(b.title));

    // Write output files
    fs.writeFileSync(CONFIG.paths.episodes, JSON.stringify(combinedEpisodes, null, 2));
    fs.writeFileSync(CONFIG.paths.shows, JSON.stringify(combinedShows, null, 2));

    // Report results
    const stats = {
      episodesAdded: allEpisodes.length,
      showsAdded: showManager.getAllShows().length - importedShows.length,
      duplicatesRemoved: (importedShows.length + showManager.getAllShows().length) - combinedShows.length,
      ignoredEpisodes: ignoredEpisodesCount,
      totalEpisodes: combinedEpisodes.length,
      totalShows: combinedShows.length
    };

    console.log(`\nResults:`);
    console.log(`Episodes added: ${stats.episodesAdded}`);
    console.log(`Shows added: ${stats.showsAdded}`);
    console.log(`Duplicate shows removed: ${stats.duplicatesRemoved}`);
    console.log(`Ignored episodes: ${stats.ignoredEpisodes}`);
    console.log(`Total episodes: ${stats.totalEpisodes}`);
    console.log(`Total shows: ${stats.totalShows}`);
    console.log("End: Gathering podcast data. ✅");
    
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
