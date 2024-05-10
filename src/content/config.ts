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
export const collections = {
  media: mediaCollection,
};
