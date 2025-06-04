import { defineCollection, z } from "astro:content";

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
    }),
});

export const collections = {
  media: mediaCollection,
  podcast: podcastCollection
};
