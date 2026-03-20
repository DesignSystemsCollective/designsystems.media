import type { CollectionEntry } from "astro:content";
import type {
  PlaylistPageData,
  ResolvedPlaylist,
  ResolvedPlaylistItem,
  ShowPageData,
  ShowWithLatestEpisode,
  SiteStats,
  TaxonomyIndex,
  TaxonomyPageData,
} from "../lib/content-domain/types";

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

export type {
  PlaylistPageData,
  ResolvedPlaylist,
  ResolvedPlaylistItem,
  ShowPageData,
  ShowWithLatestEpisode,
  SiteStats,
  TaxonomyIndex,
  TaxonomyPageData,
};
