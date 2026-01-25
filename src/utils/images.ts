import type { ImageMetadata } from 'astro';

const showImages = import.meta.glob<{ default: ImageMetadata }>(
  "/src/content/show/*/poster.jpg",
  { eager: true }
);

/**
 * Safely gets the show poster image metadata, handling special characters in paths
 * Returns image metadata for use with Astro Image component
 * @param showSlug - The show's slug
 * @param hasEpisodeImage - Whether the episode has its own image
 * @param episodeImage - Optional episode-specific image URL
 * @returns The image metadata for the poster
 */
export function getShowImage(
  showSlug: string | undefined,
  hasEpisodeImage: boolean = false,
  episodeImage?: string | null
): ImageMetadata | undefined {
  if (hasEpisodeImage && episodeImage) {
    // External images are handled differently
    return undefined;
  }

  if (!showSlug) {
    return undefined;
  }

  // Normalize the path to match the glob pattern
  const normalizedPath = `/src/content/show/${showSlug}/poster.jpg`;
  const image = showImages[normalizedPath];

  return image?.default;
}

/**
 * Gets all available show images
 * @returns Record of show slugs to image metadata
 */
export function getAllShowImages(): Record<string, ImageMetadata> {
  const images: Record<string, ImageMetadata> = {};
  
  Object.entries(showImages).forEach(([path, image]) => {
    const slug = path.split('/').slice(-2)[0]; // Extract slug from path
    if (image?.default) {
      images[slug] = image.default;
    }
  });

  return images;
}
