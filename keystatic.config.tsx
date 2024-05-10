import { collection, config, fields } from "@keystatic/core";

export default config({
  storage: {
    kind: "local",
  },
  ui: {
    brand: {
      name: "DesignSystems.media",
    },
  },
  collections: {
    media: collection({
      label: "Media",
      path: "src/content/media/*/",
      slugField: "title",
      format: {
        contentField: "content",
      },
      schema: {
        title: fields.slug({ name: { label: "Title" } }),
        description: fields.text({ label: "Description", multiline: true }),
        publishedAt: fields.date({
          label: "Published At",
          validation: { isRequired: true },
        }),
        dateAdded: fields.date({ label: "Date added" }),
        image: fields.text({ label: "Image" }),
        poster: fields.text({ label: "Poster" }),
        localImages: fields.checkbox({
          label: "Local Images",
          defaultValue: true,
        }),
        duration: fields.text({ label: "Duration" }),
        privacyStatus: fields.text({ label: "Privacy Status" }),
        videoUrl: fields.text({ label: "Video URL" }),
        tags: fields.array(fields.text({ label: "Tag" }), {
          label: "Tags",
          itemLabel: (data) => data.value,
        }),
        categories: fields.array(fields.text({ label: "Category" }), {
          label: "Categories",
          itemLabel: (data) => data.value,
        }),
        speakers: fields.array(fields.text({ label: "Speaker" }), {
          label: "Speakers",
          itemLabel: (data) => data.value,
        }),
        draft: fields.checkbox({ label: "Draft" }),
        // Longform copy
        content: fields.mdx({ label: "Content" }),
      },
    }),
  },
});
