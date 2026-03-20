import { getCollection } from "astro:content";
import type { ContentCollections } from "./types.ts";

let collectionsPromise: Promise<ContentCollections> | undefined;

export function loadCollections(): Promise<ContentCollections> {
  if (!collectionsPromise) {
    collectionsPromise = Promise.all([
      getCollection("media"),
      getCollection("podcast"),
      getCollection("show"),
      getCollection("playlists"),
    ]).then(([media, podcast, show, playlists]) => ({
      media,
      podcast,
      show,
      playlists,
    }));
  }

  return collectionsPromise;
}
