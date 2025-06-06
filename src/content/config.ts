import { defineCollection, z } from "astro:content";

const showCollection = defineCollection({
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
      duration: z.string().optional(),
      privacyStatus: z.string().optional(),
      videoUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      speakers: z.array(z.string()).optional(),
      draft: z.boolean(),
    }),
});


const podcastCollection = defineCollection({
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
      
      // Podcast-specific fields
      duration: z.string().optional(),
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
      type: z.literal('podcast').optional(),
      draft: z.boolean(),
      showSlug: z.string(),
    }),
});

export const collections = {
  media: mediaCollection,
  podcast: podcastCollection,
  show: showCollection
};
