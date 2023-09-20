import { defineCollection, z } from "astro:content";

const mediaCollection = defineCollection({
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional(),
      // Transform string to Date object
      publishedAt: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      image: image().optional(),
      poster: image().optional(),
      videoUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
    }),
});
export const collections = {
  media: mediaCollection,
};
