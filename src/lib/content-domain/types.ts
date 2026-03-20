import type { CollectionEntry } from "astro:content";

export type ShowEntry = CollectionEntry<"show">;
export type PodcastEntry = CollectionEntry<"podcast">;
export type MediaEntry = CollectionEntry<"media">;
export type PlaylistEntry = CollectionEntry<"playlists">;

export type MediaLikeEntry = MediaEntry | PodcastEntry;
export type TaxonomyKind = "tags" | "speakers";
export type PlaylistItemRef = PlaylistEntry["data"]["items"][number];

export interface ResolvedPlaylistItem {
  type: PlaylistItemRef["type"];
  entry: MediaLikeEntry;
}

export interface ResolvedPlaylist extends PlaylistEntry {
  resolvedItems: ResolvedPlaylistItem[];
}

export interface ContentCollections {
  media: MediaEntry[];
  podcast: PodcastEntry[];
  show: ShowEntry[];
  playlists: PlaylistEntry[];
}

export interface NormalizedMediaItem {
  slug: string;
  collection: MediaLikeEntry["collection"];
  title: string;
  publishedAt: Date;
  tags: string[];
  speakers: string[];
  draft: boolean;
  entry: MediaLikeEntry;
}

export interface TaxonomyItem {
  name: string;
  slug: string;
  count: number;
  posts: MediaLikeEntry[];
}

export interface TaxonomyIndex {
  kind: TaxonomyKind;
  items: TaxonomyItem[];
  groupedItems: Record<string, TaxonomyItem[]>;
}

export interface TaxonomyPageData {
  kind: TaxonomyKind;
  item: TaxonomyItem;
  posts: MediaLikeEntry[];
  videoPosts: MediaEntry[];
  podcastPosts: PodcastEntry[];
}

export interface ShowPageData {
  show: ShowEntry;
  episodes: PodcastEntry[];
  latestEpisodeDate: Date | null;
}

export interface PlaylistPageData {
  playlist: ResolvedPlaylist;
}

export interface SiteStats {
  totalMedia: number;
  videos: number;
  podcastShows: number;
  podcastEpisodes: number;
  tags: number;
  speakers: number;
  underMinute: number;
  drafts: number;
  unsortedTag: number;
}

export interface ShowWithLatestEpisode extends ShowEntry {
  _latestEpisodeDate: Date;
}

export interface ContentIndex {
  allVideos: MediaEntry[];
  allPodcasts: PodcastEntry[];
  allShows: ShowEntry[];
  allPlaylists: PlaylistEntry[];
  videos: MediaEntry[];
  podcasts: PodcastEntry[];
  shows: ShowEntry[];
  media: MediaLikeEntry[];
  drafts: CollectionEntry<"media" | "podcast" | "show" | "playlists">[];
  underOneMinute: MediaLikeEntry[];
  unsorted: MediaLikeEntry[];
  tagIndex: TaxonomyIndex;
  speakerIndex: TaxonomyIndex;
  showsByRecentEpisode: ShowWithLatestEpisode[];
  latestEpisodeDateByShow: Map<string, Date>;
  showsBySlug: Map<string, ShowEntry>;
  podcastsBySlug: Map<string, PodcastEntry>;
  videosBySlug: Map<string, MediaEntry>;
  resolvedPlaylists: ResolvedPlaylist[];
  stats: SiteStats;
}
