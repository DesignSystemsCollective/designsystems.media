import { defineCollection, z } from "astro:content";

const mediaCollection = defineCollection({
  // Type-check frontmatter using a schema
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // Transform string to Date object
    publishedAt: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    image: z.string().optional(),
    poster: z.string().optional(),
    videoUrl: z.string().optional(),
  }),
});
export const collections = {
  media: mediaCollection,
};
