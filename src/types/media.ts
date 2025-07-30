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
