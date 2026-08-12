// Shared types for the content-aggregator ingestion layer.
//
// These describe the shapes flowing through content-aggregator itself - raw
// API responses and the frontmatter objects built from them - as opposed to
// src/types/media.ts, which describes the site's already-validated content
// collection entries (post-Zod-schema, with Astro's `image()` transform
// already applied). The two are deliberately kept separate: an ingestion
// script has a Video object with a plain `image: string` (a remote URL it's
// about to try downloading), while the site's MediaEntry has already gone
// through validation and has `image` resolved to a local ImageMetadata
// object (or omitted). Reusing one type for both would either be wrong for
// one side or require it to model states that don't apply to it.
//
// Added in Phase 4 of the refactor plan (TypeScript conversion) - see the
// accompanying ADR. Fields are additive as more of content-aggregator gets
// converted; this isn't meant to be exhaustive on day one.

export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface VideoThumbnails {
  default?: Thumbnail;
  medium?: Thumbnail;
  high?: Thumbnail;
  standard?: Thumbnail;
  maxres?: Thumbnail;
}

// A subset of Thumbnail-shaped input that getPosterUrl actually reads.
// Deliberately narrower than VideoThumbnails so a caller with a
// differently-shaped thumbnails object doesn't need to conform to YouTube's
// full shape just to reuse this helper.
export interface PosterThumbnailSource {
  maxres?: { url: string };
  high?: { url: string };
}

// A video as produced by youtube.js and consumed by getVideos.js.
// `durationSeconds` is optional/undefined for any video whose source API
// didn't return a duration - see ADR 0004 on why generateMdxFile guards
// this rather than assuming it's always present.
export interface Video {
  title: string;
  publishedAt: string;
  thumbnails: VideoThumbnails;
  videoUrl: string;
  duration: string;
  durationSeconds?: number;
  privacyStatus: string;
  description: string;
}

// An episode as produced by podcast.js's getEpisodesFromFeed and consumed
// by getPodcasts.js. `feed`/`feedInfo` (the raw Podcast Index API feed
// object) is deliberately left untyped (`any`) at call sites, same
// reasoning as youtube.ts's raw API response traversal - it's a large,
// only-partially-used external shape, and typing content-aggregator's own
// output objects is what actually catches bugs here.
export interface Episode {
  title: string;
  description: string;
  podcastTitle: string;
  episodeUrl: string;
  audioUrl: string;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  episodeImageUrl: string | null;
  podcastImageUrl: string;
  thumbnails: { high: { url: string }; maxres: { url: string } };
  feedUrl: string;
  feedId: unknown;
  episodeId: unknown;
  guid: string;
  season: number | null;
  episode: number | null;
  explicit: boolean;
  type: string;
}

// Return shape shared by getPodcastByFeedUrl/searchPodcastByTitle/
// getTrendingPodcasts: a batch of episodes plus the raw feed/show metadata
// they came from. `showData` stays `any` for the same reason as `feed`
// above - it's the untyped Podcast Index API response object, consumed
// selectively (feed.title, feed.url, etc.) rather than exhaustively.
export interface PodcastFetchResult {
  episodes: Episode[];
  showData: any;
}

// A configured ingestion source, as read from content-aggregator/data/
// sources.json. `type` is a literal union of the registered videoHandlers
// keys in getVideos.ts - every entry in sources.json matches one of these
// today (see ADR 0016: the one entry that didn't, a "vimeo-channel" source
// with no matching handler, was removed rather than fixed). getVideos.js's
// handler lookup still treats an unrecognized type as a soft "skip with a
// warning" at runtime (see main()) as defense against sources.json drifting
// again, even though the type no longer allows constructing one statically.
export interface Source {
  name: string;
  platform: string;
  channelName: string;
  type: "youtube-channel" | "youtube-playlist";
  url: string;
}

// A show, as built by getPodcasts.ts's ShowManager.createShow from a raw
// Podcast Index feed object. `id`/`itunesId`/`funding`/`value` stay
// `unknown` rather than a guessed concrete type - they're passed through
// largely opaquely (stored, compared, occasionally serialized) rather than
// operated on, and the Podcast Index API doesn't guarantee their shape.
export interface Show {
  id: unknown;
  slug: string;
  title: string;
  description: string;
  speakers: string;
  feedUrl: string;
  websiteUrl: string;
  imageUrl: string;
  categories: string[];
  language: string;
  explicit: boolean;
  episodeCount: number;
  lastUpdate: string;
  dateAdded: string;
  itunesId: unknown;
  guid: string;
  funding: unknown;
  value: unknown;
  medium: string;
  dead: number;
  locked: number;
}

// A configured podcast ingestion source, as read from content-aggregator/
// data/podcast-sources.json. Discriminated on `type` so getPodcasts.ts's
// switch statement narrows correctly (source.url only makes sense for
// "podcast-feed", source.term only for "podcast-search", etc.) - unlike
// video's Source type, every currently-configured entry does match one of
// these three known types, so a literal union is accurate here rather than
// hiding a gap.
export interface PodcastFeedSource {
  type: "podcast-feed";
  url: string;
  title?: string;
  speakers?: string[];
}

export interface PodcastSearchSource {
  type: "podcast-search";
  term: string;
  speakers?: string[];
}

export interface TrendingPodcastSource {
  type: "trending";
  max?: number;
  speakers?: string[];
}

export type PodcastSource = PodcastFeedSource | PodcastSearchSource | TrendingPodcastSource;

// The generic frontmatter shape written by writeContentFile. Deliberately
// loose (most fields optional, arbitrary extra keys allowed) rather than a
// tight union of the media/show/episode schemas in src/content/config.ts -
// those are enforced by Astro/Zod at build time; this type exists only to
// catch typos and obviously-wrong types at the point frontmatter objects
// are constructed in content-aggregator, not to duplicate the full schema.
export interface Frontmatter {
  [key: string]: unknown;
}
