import { getCollection } from "astro:content";
import type {
  MediaEntry,
  PodcastEntry,
  PlaylistEntry,
  ResolvedPlaylist,
  ResolvedPlaylistItem,
} from "../types/media";

function buildEntryMaps(media: MediaEntry[], podcasts: PodcastEntry[]) {
  const mediaMap = new Map(media.map((entry) => [entry.slug, entry]));
  const podcastMap = new Map(podcasts.map((entry) => [entry.slug, entry]));

  return { mediaMap, podcastMap };
}

export async function getPlaylists(): Promise<PlaylistEntry[]> {
  return getCollection("playlists", ({ data }) => !data.draft);
}

export async function getPlaylistsWithResolvedItems(): Promise<ResolvedPlaylist[]> {
  const [playlists, media, podcasts] = await Promise.all([
    getPlaylists(),
    getCollection("media", ({ data }) => !data.draft),
    getCollection("podcast", ({ data }) => !data.draft),
  ]);

  const { mediaMap, podcastMap } = buildEntryMaps(media, podcasts);

  return playlists.map((playlist) => {
    const resolvedItems = playlist.data.items
      .map<ResolvedPlaylistItem | null>((item) => {
        const entry =
          item.type === "media"
            ? mediaMap.get(item.slug)
            : podcastMap.get(item.slug);

        if (!entry) {
          return null;
        }

        return {
          type: item.type,
          entry,
        };
      })
      .filter(Boolean) as ResolvedPlaylistItem[];

    return {
      ...playlist,
      resolvedItems,
    };
  });
}

export async function getPlaylistBySlug(
  slug: string
): Promise<ResolvedPlaylist | null> {
  const playlists = await getPlaylistsWithResolvedItems();
  return playlists.find((playlist) => playlist.slug === slug) ?? null;
}

