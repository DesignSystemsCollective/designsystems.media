import type { ImageType } from '../types/media';

const showImages = import.meta.glob("/src/content/show/*/poster.jpg", {
  eager: true,
}) as Record<string, ImageType>;

/**
 * Safely gets the show poster image URL, handling special characters in paths
 * @param showSlug - The show's slug
 * @param hasEpisodeImage - Whether the episode has its own image
 * @param episodeImage - Optional episode-specific image
 * @returns The URL of the image to use
 */
export function getShowImage(
  showSlug: string | undefined,
  hasEpisodeImage: boolean = false,
  episodeImage?: string | null
): string | undefined {
  if (hasEpisodeImage && episodeImage) {
    return episodeImage;
  }

  if (!showSlug) {
    return undefined;
  }

  // Normalize the path to match the glob pattern
  const normalizedPath = `/src/content/show/${showSlug}/poster.jpg`;
  const image = showImages[normalizedPath];

  return image?.default?.src;
}

/**
 * Gets all available show images
 * @returns Record of show slugs to image URLs
 */
export function getAllShowImages(): Record<string, string> {
  const images: Record<string, string> = {};
  
  Object.entries(showImages).forEach(([path, image]) => {
    const slug = path.split('/').slice(-2)[0]; // Extract slug from path
    if (image?.default?.src) {
      images[slug] = image.default.src;
    }
  });

  return images;
}
