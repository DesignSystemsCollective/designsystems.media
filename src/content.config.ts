import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { SERIES, TOPICS, TOOLS, SYSTEMS } from "./lib/content-domain/taxonomy.ts";

// ADR 0012: `series`/`topics`/`tools` are the new controlled taxonomies
// replacing the old freeform `tags` field, enforced here as closed Zod
// enums (z.enum requires a non-empty tuple type, hence the `as
// [string, ...string[]]` casts - the arrays themselves stay defined
// once in taxonomy.ts). They're additive and optional for now: `tags`
// and `categories` are left in place untouched, and existing content
// keeps validating as-is, until the migration pass referenced in ADR
// 0012's Open questions actually re-tags the 1,331 existing entries.
const seriesEnum = z.enum(SERIES as unknown as [string, ...string[]]);
const topicsEnum = z.enum(TOPICS as unknown as [string, ...string[]]);
const toolsEnum = z.enum(TOOLS as unknown as [string, ...string[]]);
// ADR 0014: named design-system products (Skapa, Spectrum, Encore...),
// not companies - see taxonomy.ts's SYSTEMS comment for the reasoning.
const systemsEnum = z.enum(SYSTEMS as unknown as [string, ...string[]]);

// Astro 6 removed the implicit "no loader = auto-scan src/content/<name>/"
// fallback that Astro 5's legacy-collections compat kept alive - every
// collection now needs an explicit loader (see ADR 0008). Each collection
// here is one folder per entry with an index.mdx inside (except playlists,
// which are flat .mdx files) - glob()'s default id generation already
// strips the "/index" suffix for index.md(x) files, so entry.id keeps
// matching what entry.slug used to be. `z` also moves from "astro:content"
// to "astro/zod" - astro:content's re-export is deprecated in Astro 6.

const playlistsCollection = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/playlists" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      description: z.string(),
      image: image().optional(),
      items: z.array(
        z.object({
          type: z.enum(["media", "podcast"]),
          slug: z.string(),
        })
      ),
      draft: z.boolean().default(false),
    }),
});

const showCollection = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./src/content/show" }),
  schema: ({ image }) =>
    z.object({
    title: z.string(),
    description: z.string(),
    speakers: z.array(z.string()).optional(),
    feedUrl: z.string().url(),
    websiteUrl: z.string().url().optional(),
    image: image().optional(),
    dateAdded: z.string(),
    lastUpdate: z.string(),
    categories: z.array(z.string()),
    language: z.string().default('en'),
    explicit: z.boolean().default(false),
    episodeCount: z.number().default(0),
    localImages: z.boolean().default(false),
    itunesId: z.number().nullable().optional(),
    guid: z.string(),
    medium: z.string().default('podcast'),
    dead: z.number().default(0),
    locked: z.number().default(0),
    type: z.literal('show'),
    draft: z.boolean().default(false),
  }),
});

const mediaCollection = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./src/content/media" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      // Transform string to Date object
      publishedAt: z.coerce.date(),
      dateAdded: z.coerce.date().optional(),
      image: image().optional(),
      poster: image().optional(),
      localImages: z.boolean(),
      duration: z.union([z.string(), z.number()]).optional(),
      durationSeconds: z.number().nullable().optional(),
      privacyStatus: z.string().optional(),
      videoUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      speakers: z.array(z.string()).optional(),
      series: z.array(seriesEnum).optional(),
      topics: z.array(topicsEnum).optional(),
      tools: z.array(toolsEnum).optional(),
      systems: z.array(systemsEnum).optional(),
      draft: z.boolean().default(false),
    }),
});


const podcastCollection = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./src/content/podcast" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      // Transform string to Date object
      publishedAt: z.coerce.date(),
      dateAdded: z.coerce.date().optional(),
      imageReference: image().optional(),
      image: image().nullable().optional(),
      poster: image().optional(),
      localImages: z.boolean(),
      
      // Podcast-specific fields
      duration: z.union([z.string(), z.number()]).optional(),
      durationSeconds: z.number().optional(),
      episodeUrl: z.string().optional(),
      audioUrl: z.string().optional(),
      podcastTitle: z.string(),
      
      // Episode metadata
      season: z.number().nullable().optional(),
      episode: z.number().nullable().optional(),
      explicit: z.union([z.boolean(), z.number()]).optional(),
      
      // RSS and identification
      feedUrl: z.string().optional(),
      guid: z.string().optional(),
      
      // Classification and organization
      tags: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      speakers: z.array(z.string()).optional(),
      series: z.array(seriesEnum).optional(),
      topics: z.array(topicsEnum).optional(),
      tools: z.array(toolsEnum).optional(),
      systems: z.array(systemsEnum).optional(),
      type: z.literal('podcast').optional(),
      draft: z.boolean().default(false),
      showSlug: z.string(),
      hasEpisodeImage: z.boolean()
    }),
});

export const collections = {
  playlists: playlistsCollection,
  media: mediaCollection,
  podcast: podcastCollection,
  show: showCollection
};
