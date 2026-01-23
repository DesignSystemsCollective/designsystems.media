import type { CollectionEntry } from "astro:content";

export interface ImageType {
  src: string;
  default?: {
    src: string;
  };
}

export type ShowEntry = CollectionEntry<"show">;
export type PodcastEntry = CollectionEntry<"podcast">;
export type MediaEntry = CollectionEntry<"media">;
export type PlaylistEntry = CollectionEntry<"playlists">;

export type PlaylistItemRef = PlaylistEntry["data"]["items"][number];

export interface ResolvedPlaylistItem {
  type: PlaylistItemRef["type"];
  entry: MediaEntry | PodcastEntry;
}

export interface ResolvedPlaylist extends PlaylistEntry {
  resolvedItems: ResolvedPlaylistItem[];
}

export interface BaseShowProps extends Partial<ShowEntry["data"]>, Partial<PodcastEntry["data"]> {
  slug?: ShowEntry["slug"] | PodcastEntry["slug"];
  episodes?: CollectionEntry<"podcast">[];
}

export type BasePodcastProps = PodcastEntry["data"] & {
  slug?: PodcastEntry["slug"];
}

export type BaseMediaProps = MediaEntry["data"] & {
  slug?: MediaEntry["slug"];
}
