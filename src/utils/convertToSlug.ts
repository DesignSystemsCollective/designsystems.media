import slugify from "slugify";

/**
 * Converts a string to a URL-friendly slug
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug string
 */
export function convertToSlug(text: string): string {
  return slugify(text, { lower: true, remove: /[*+~.()'"!:@]/g });
}
