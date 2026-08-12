// getPodcasts.ts
//
// Converted to TypeScript in Phase 4 - see the accompanying ADR.

import type { Episode, PodcastSource, PodcastFeedSource, Show } from "../shared/types";

const path = require("path");
// dotenv 17 logs a "injecting env..." message on every config() call by
// default - quiet it to keep this script's output limited to its own logs.
require("dotenv").config({ path: path.join(__dirname, '../../../.env'), quiet: true });

const fs = require("fs");
const slugify = require("slugify");
const TurndownService = require('turndown');
const {
  getPodcastByFeedUrl,
  searchPodcastByTitle,
  getTrendingPodcasts,
} = require("./podcast.ts");
const {
  loadJsonFile: sharedLoadJsonFile,
  createDirectory: sharedCreateDirectory,
  sanitizeTitle,
  writeContentFile,
} = require("../shared/shared.ts");

// Configuration
const CONFIG = {
  // sharedLoadJsonFile, not a raw require(): getVideos.ts already loads its
  // equivalent sources.json this way (loadJsonFile(SOURCES_FILE) as
  // Source[]) rather than require()-ing it directly - using require() here
  // was the one inconsistency between the two scripts' otherwise-identical
  // "load essential config" pattern. The behavior difference is real, not
  // just style: require() throws if the file is missing, while
  // loadJsonFile() silently returns [] - matching getVideos.ts's existing
  // (already-established) precedent of treating a missing sources file as
  // "nothing configured" rather than a fatal error.
  //
  // `as` casts, not typed generics: sharedLoadJsonFile's return is untyped
  // (`any`) across the require() boundary that loads shared.ts itself, so a
  // generic type argument can't flow through - same reasoning as
  // getVideos.ts's own loadJsonFile() casts.
  sources: sharedLoadJsonFile(path.join(__dirname, "../../data/podcast-sources.json")) as PodcastSource[],
  ignored: sharedLoadJsonFile(path.join(__dirname, "../../data/podcast-ignore.json")) as string[],
  paths: {
    episodes: path.join(__dirname, "../../data/podcast/episodes.json"),
    shows: path.join(__dirname, "../../data/podcast/shows.json"),
    episodesDir: path.join(__dirname, "../../../src/content/podcast/"),
    showsDir: path.join(__dirname, "../../../src/content/show/")
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
  filter: (node: any) => node.nodeName === 'P' && node.innerHTML.trim() === '',
  replacement: () => ''
});

// Utility functions
const utils = {
  loadJsonFile: sharedLoadJsonFile,

  // Parameter is `unknown`, not `string`: the guard on the next line is
  // exactly the kind of defensive runtime check that's only meaningful if
  // the type doesn't already rule out what it's checking for.
  convertHtmlToMarkdown(html: unknown): string {
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
    } catch (error: any) {
      console.warn('Error converting HTML to markdown:', error.message);
      return html.replace(/<[^>]*>/g, '').trim();
    }
  },

  generateSlug(title: string, maxLength: number = 50): string {
    return slugify(title, CONFIG.slugify).substring(0, maxLength);
  },

  formatYamlArray(items: string[]): string {
    return items.length > 0 ? items.map(item => `"${item}"`).join(', ') : '"Uncategorized"';
  },

  createDirectory: sharedCreateDirectory,

  // Keeps every item that has no id (nothing to dedupe an id-less item
  // against), and the first occurrence of each id seen - dropping the rest.
  removeDuplicatesById<T extends { id?: unknown }>(items: T[]): T[] {
    const seenIds = new Set<unknown>();
    return items.filter(item => {
      if (!item.id) return true;
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
  }
};

// Show management
class ShowManager {
  shows: Show[];
  showsMap: Map<unknown, Show>;

  constructor(existingShows: Show[] = []) {
    this.shows = [...existingShows];
    this.showsMap = new Map(
      existingShows.map((show): [unknown, Show] => [show.id, show]).filter(([id]) => id),
    );
  }

  findExisting(feedData: any): Show | undefined {
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

  createShow(feedData: any): Show {
    const existing = this.findExisting(feedData);
    if (existing) {
      // console.log(`Show already exists: ${feedData.title} (ID: ${feedData.id || 'no ID'})`);
      return existing;
    }

    const show: Show = {
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

  getAllShows(): Show[] {
    return this.shows;
  }

  findBySlug(slug: string): Show | undefined {
    return this.shows.find(show => show.slug === slug);
  }
}

// File generators
const fileGenerators = {
  generateShowMdx(show: Show): void {
    const folderPath = path.join(CONFIG.paths.showsDir, show.slug);
    const indexPath = path.join(folderPath, "index.mdx");

    utils.createDirectory(folderPath);

    // Skip if file already exists
    if (fs.existsSync(indexPath)) return;

    const frontmatter = {
      title: show.title,
      description: show.description,
      speakers: [show.speakers],
      feedUrl: show.feedUrl,
      websiteUrl: show.websiteUrl,
      imageReference: show.imageUrl,
      image: show.imageUrl,
      dateAdded: show.dateAdded,
      lastUpdate: show.lastUpdate,
      categories: show.categories.length > 0 ? show.categories : ["Uncategorized"],
      language: show.language,
      explicit: show.explicit,
      episodeCount: show.episodeCount,
      localImages: false,
      itunesId: show.itunesId,
      guid: show.guid,
      medium: show.medium,
      dead: show.dead,
      locked: show.locked,
      type: "show",
      draft: false,
    };

    fs.writeFileSync(indexPath, writeContentFile(frontmatter, `\n${show.description}`));
    console.log(`Created show: ${show.title}`);
  },

  generateEpisodeMdx(
    episode: Episode,
    showSlug: string,
    predefinedSpeakers: string[] | null = null,
    showData: Show | null | undefined = null,
  ): void {
    const sanitizedTitle = sanitizeTitle(episode.title);
    const folderName = utils.generateSlug(sanitizedTitle).split("-").slice(0, 7).join("-");
    const folderPath = path.join(CONFIG.paths.episodesDir, folderName);
    const indexPath = path.join(folderPath, "index.mdx");

    utils.createDirectory(folderPath);

    // Skip if file already exists
    if (fs.existsSync(indexPath)) return;

    // Determine speakers
    const speakers = predefinedSpeakers && predefinedSpeakers.length > 0
      ? predefinedSpeakers
      : [episode.podcastTitle || ""];

    // Determine image reference
    let imageReference: string | null = null;
    if (episode.episodeImageUrl) {
      const isDifferentFromShow = !showData || showData.imageUrl !== episode.episodeImageUrl;
      const isDifferentFromPodcast = episode.episodeImageUrl !== episode.podcastImageUrl;

      if (isDifferentFromShow && isDifferentFromPodcast) {
        imageReference = episode.episodeImageUrl;
      }
    }

    const speakersList = speakers.length > 0 ? speakers : ["Uncategorized"];
    const hasEpisodeImage = Boolean(imageReference);

    const frontmatter = {
      title: episode.title,
      publishedAt: episode.publishedAt,
      dateAdded: new Date().toISOString().split('T')[0],
      episodeUrl: episode.episodeUrl,
      audioUrl: episode.audioUrl,
      podcastTitle: episode.podcastTitle,
      showSlug: showSlug,
      image: imageReference,
      localImages: false,
      tags: [],
      categories: ["Podcast"],
      duration: episode.duration,
      durationSeconds: episode.durationSeconds,
      draft: false,
      speakers: speakersList,
      type: "podcast",
      season: episode.season || null,
      episode: episode.episode || null,
      explicit: episode.explicit,
      feedUrl: episode.feedUrl,
      guid: episode.guid,
      hasEpisodeImage: hasEpisodeImage,
    };

    fs.writeFileSync(
      indexPath,
      writeContentFile(frontmatter, utils.convertHtmlToMarkdown(episode.description)),
    );
    console.log(`Created episode: ${episode.title}`);
  }
};

// A processed source's episodes, plus the show they belong to and the
// source config that produced them.
interface FeedResult {
  episodes: Episode[];
  show: Show;
  source: PodcastSource;
}

// Data processors
const dataProcessors = {

// getPodcastByFeedUrl/searchPodcastByTitle/getTrendingPodcasts already catch
// their own errors and return `showData: null` rather than throwing (a bad
// feed URL, missing API credentials, network failure, or a search/feed
// with no results all land here) - see podcast.ts. Previously nothing
// downstream checked for that: `showManager.createShow(showData)` was
// called unconditionally, and createShow's very first line reads
// `feedData.id`, which throws on null and took down the *entire*
// ingestion run over a single bad source. Fixed by skipping just that
// source (logged clearly) instead of letting it crash everything else.

async processFeedSource(
  source: PodcastFeedSource,
  showManager: ShowManager,
  importedEpisodes: Episode[],
): Promise<FeedResult | null> {
  const { episodes, showData } = await getPodcastByFeedUrl(source.url, importedEpisodes);

  if (!showData) {
    console.warn(`Skipping feed ${source.url}: no show data returned (the fetch likely failed - see the error logged above, if any).`);
    return null;
  }

  if (showData.title) {
    console.log(`🔄 ${showData.title}`);
  } else {
    console.log(`Fetching show data from feed ${source.url}... (no title found)`);
  }

  const show = showManager.createShow(showData);
  fileGenerators.generateShowMdx(show);
  return { episodes, show, source };
},

  async processSearchSource(
    source: PodcastSource & { term: string },
    showManager: ShowManager,
    importedEpisodes: Episode[],
  ): Promise<FeedResult | null> {
    console.log(`Searching for podcast: ${source.term}...`);
    const { episodes, showData } = await searchPodcastByTitle(source.term, importedEpisodes);

    if (!showData) {
      console.warn(`Skipping search "${source.term}": no podcast found, or the search failed.`);
      return null;
    }

    const show = showManager.createShow(showData);
    fileGenerators.generateShowMdx(show);
    return { episodes, show, source };
  },

  async processTrendingSource(
    source: PodcastSource & { max?: number },
    showManager: ShowManager,
    importedEpisodes: Episode[],
  ): Promise<FeedResult[]> {
    console.log(`Fetching trending podcasts...`);
    const trendingData = await getTrendingPodcasts(importedEpisodes, source.max || 10);

    const results: FeedResult[] = [];
    for (const item of trendingData) {
      // Defensive, same reasoning as above: getTrendingPodcasts builds
      // showData directly from a real API response array today, so this
      // shouldn't be null in practice, but skipping a bad entry here costs
      // nothing and matches the guard used for the other two sources.
      if (!item.showData) {
        console.warn(`Skipping a trending result with no show data.`);
        continue;
      }

      const show = showManager.createShow(item.showData);
      fileGenerators.generateShowMdx(show);
      results.push({ episodes: item.episodes, show, source });
    }
    return results;
  }
};

// Main execution
async function main(): Promise<void> {
  try {
    console.log("Start: Gathering podcast data... 🎙️");

    // Load existing data
    const importedEpisodes = utils.loadJsonFile(CONFIG.paths.episodes) as Episode[];
    const importedShows = utils.loadJsonFile(CONFIG.paths.shows) as Show[];

    const showManager = new ShowManager(importedShows);
    const allEpisodes: Episode[] = [];
    const feedDataCollection: FeedResult[] = [];
    let ignoredEpisodesCount = 0;

    // Phase 1: Process all sources and create shows
    console.log("Phase 1: Processing shows...");

    for (const source of CONFIG.sources) {
      let results: FeedResult[] = [];

      switch (source.type) {
        case "podcast-feed": {
          // processFeedSource returns null for a source it skipped (see its
          // own comment above) rather than throwing - filter that out
          // instead of pushing a null into feedDataCollection.
          const result = await dataProcessors.processFeedSource(source, showManager, importedEpisodes);
          results = result ? [result] : [];
          break;
        }
        case "podcast-search": {
          const result = await dataProcessors.processSearchSource(source, showManager, importedEpisodes);
          results = result ? [result] : [];
          break;
        }
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
        fileGenerators.generateEpisodeMdx(episode, show.slug, source.speakers ?? null, showData);
        allEpisodes.push(episode);
      }
    }

    // Combine and deduplicate data
    const combinedEpisodes = [...importedEpisodes, ...allEpisodes];
    const combinedShows = utils.removeDuplicatesById([...importedShows, ...showManager.getAllShows()]);

    // Sort data
    combinedEpisodes.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
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

  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

// Run the script (only when executed directly, not when required by tests)
if (require.main === module) {
  main();
}

module.exports = {
  CONFIG,
  utils,
  ShowManager,
  fileGenerators,
  dataProcessors,
};
