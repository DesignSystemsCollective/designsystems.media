import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const COLLECTION_NAMES = ["media", "podcast", "show", "playlists"];
const LOCAL_ASSET_FIELDS = ["image", "poster", "imageReference"];

function isLocalAssetReference(value) {
  return typeof value === "string" && (value.startsWith("./") || value.startsWith("../"));
}

function createEntry(collection, slug, dirPath, frontmatter) {
  return {
    collection,
    slug,
    dirPath,
    frontmatter,
  };
}

async function readCollectionEntries(contentRoot, collection) {
  const collectionPath = path.join(contentRoot, collection);
  const entries = await fs.readdir(collectionPath, { withFileTypes: true });

  const results = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dirPath = path.join(collectionPath, entry.name);
    const indexPath = path.join(dirPath, "index.mdx");

    try {
      const source = await fs.readFile(indexPath, "utf8");
      const { data } = matter(source);
      results.push(createEntry(collection, entry.name, dirPath, data));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return results;
}

export async function loadContentEntries(contentRoot) {
  const collections = await Promise.all(
    COLLECTION_NAMES.map(async (collection) => [
      collection,
      await readCollectionEntries(contentRoot, collection),
    ]),
  );

  return Object.fromEntries(collections);
}

export function findMissingAssetErrors(contentEntries) {
  const errors = [];

  for (const collectionEntries of Object.values(contentEntries)) {
    for (const entry of collectionEntries) {
      for (const field of LOCAL_ASSET_FIELDS) {
        const value = entry.frontmatter[field];
        if (!isLocalAssetReference(value)) {
          continue;
        }

        const assetPath = path.resolve(entry.dirPath, value);
        try {
          errors.push({
            type: "missing-asset",
            message: `${entry.collection}/${entry.slug} references missing asset "${value}" in "${field}"`,
            assetPath,
          });
          continue;
        } catch {
          continue;
        }
      }
    }
  }

  return errors;
}

export async function resolveMissingAssetErrors(contentEntries) {
  const errors = [];

  for (const collectionEntries of Object.values(contentEntries)) {
    for (const entry of collectionEntries) {
      for (const field of LOCAL_ASSET_FIELDS) {
        const value = entry.frontmatter[field];
        if (!isLocalAssetReference(value)) {
          continue;
        }

        const assetPath = path.resolve(entry.dirPath, value);
        try {
          await fs.access(assetPath);
        } catch {
          errors.push({
            type: "missing-asset",
            message: `${entry.collection}/${entry.slug} references missing asset "${value}" in "${field}"`,
            assetPath,
          });
        }
      }
    }
  }

  return errors;
}

export function findDuplicateSlugErrors(contentEntries) {
  const errors = [];

  for (const [collection, entries] of Object.entries(contentEntries)) {
    const seen = new Set();

    for (const entry of entries) {
      if (seen.has(entry.slug)) {
        errors.push({
          type: "duplicate-slug",
          message: `Duplicate slug "${entry.slug}" found in collection "${collection}"`,
        });
        continue;
      }

      seen.add(entry.slug);
    }
  }

  return errors;
}

export function findRelationshipErrors(contentEntries) {
  const errors = [];
  const showSlugs = new Set(contentEntries.show.map((entry) => entry.slug));
  const mediaSlugs = new Set(contentEntries.media.map((entry) => entry.slug));
  const podcastSlugs = new Set(contentEntries.podcast.map((entry) => entry.slug));

  for (const episode of contentEntries.podcast) {
    if (episode.frontmatter.showSlug && !showSlugs.has(episode.frontmatter.showSlug)) {
      errors.push({
        type: "unknown-show",
        message: `Podcast "${episode.slug}" references unknown showSlug "${episode.frontmatter.showSlug}"`,
      });
    }
  }

  for (const playlist of contentEntries.playlists) {
    const items = Array.isArray(playlist.frontmatter.items) ? playlist.frontmatter.items : [];

    for (const item of items) {
      const targetSet = item.type === "podcast" ? podcastSlugs : mediaSlugs;
      if (!targetSet.has(item.slug)) {
        errors.push({
          type: "missing-playlist-ref",
          message: `Playlist "${playlist.slug}" references missing ${item.type} slug "${item.slug}"`,
        });
      }
    }
  }

  return errors;
}

export async function validateContentEntries(contentEntries) {
  return [
    ...(await resolveMissingAssetErrors(contentEntries)),
    ...findDuplicateSlugErrors(contentEntries),
    ...findRelationshipErrors(contentEntries),
  ];
}
