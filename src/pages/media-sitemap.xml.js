import { getCollection } from "astro:content";
import { XMLBuilder } from "fast-xml-parser";
import { isDurationUnderOneMinute } from "../utils/isDurationUnderOneMinute";

export const prerender = true;

function convertToISO8601Duration(durationString) {
  const parts = durationString.split(":").map(Number).reverse();
  const [seconds = 0, minutes = 0, hours = 0] = parts;
  return `PT${hours ? hours + "H" : ""}${minutes ? minutes + "M" : ""}${
    seconds ? seconds + "S" : ""
  }`;
}

function extractFirstParagraph(markdown = '') {
  if (typeof markdown !== 'string') return '';
  return markdown
    .split('\n\n')
    .map(p => p.trim())
    .find(p => p.length && !p.startsWith('#'))
    ?.replace(/\[(.*?)\]\(.*?\)/g, '$1')  // strip markdown links
    .replace(/[*_`#>~-]/g, '')            // strip markdown formatting
    .slice(0, 300);                       // optional limit
}

export async function GET() {
  const videos = (await getCollection("media"))
    .filter(
      (post) =>
        !post.data.draft && !isDurationUnderOneMinute(post.data.duration)
    )
    .sort(
      (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf()
    );

const baseUrl = import.meta.env.SITE; // Get the base URL for the site


  const urlset = {
   "@xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "@xmlns:video": "http://www.google.com/schemas/sitemap-video/1.1",
    "@xmlns:xhtml": "http://www.w3.org/1999/xhtml",
    url: videos.map((video) => {
      const data = video.data;
      const description = extractFirstParagraph(data);

      return {
        loc: `${baseUrl}/video/${video.slug}/`,
        "video:video": {
          "video:thumbnail_loc": new URL(
            data.poster?.src || data.image?.src || "",
            import.meta.env.SITE
          ).toString(),
          "video:title": { "#text": data.title },
          "video:description": { "#text": description || video.data.title },
          ...(data.videoUrl && { "video:player_loc": data.videoUrl }),
          ...(data.duration && {
            "video:duration": convertToISO8601Duration(data.duration),
          }),
          ...(data.publishedAt && {
            "video:publication_date": new Date(data.publishedAt).toISOString(),
          }),
          ...(video.data.tags?.length && {
            "video:tag": video.data.tags,
          }),
          ...(video.data.speakers?.length && {
            "video:actor": video.data.speakers.map((name) => ({
              name,
            })),
          }),
        },
      };
    }),
  };

  const builder = new XMLBuilder({ format: true });
  const xml = builder.build({ urlset });

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
