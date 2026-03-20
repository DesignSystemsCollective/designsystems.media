import {
  getPlaylistEntries,
  getPlaylistPage,
} from "../lib/content-domain";
import type { PlaylistEntry, ResolvedPlaylist } from "../types/media";

export async function getPlaylists(): Promise<PlaylistEntry[]> {
  return getPlaylistEntries();
}

export async function getPlaylistsWithResolvedItems(): Promise<ResolvedPlaylist[]> {
  return getPlaylistEntries();
}

export async function getPlaylistBySlug(
  slug: string,
): Promise<ResolvedPlaylist | null> {
  return (await getPlaylistPage(slug))?.playlist ?? null;
}
