import { XMLBuilder } from "fast-xml-parser";
import { allVideosFilteredAndSorted } from "../utils/mediaCollection";

export const prerender = true;

function timeToSeconds(timeString) {
  // Split the time string by colon
  const parts = timeString.split(':');
  
  // Convert to numbers and calculate total seconds
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  
  // Calculate total seconds: hours → seconds + minutes → seconds + seconds
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  
  return totalSeconds;
}

function extractFirstParagraph(markdown = "") {
  if (typeof markdown !== "string") return "";

  // First, strip out code blocks to avoid including them in descriptions
  const withoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");

  // Find the first real paragraph (not a heading, not empty)
  return (
    withoutCodeBlocks
      .split("\n\n")
      .map((p) => p.trim())
      .find((p) => p.length && !p.startsWith("#"))
      ?.replace(/\[(.*?)\]\(.*?\)/g, "$1") // strip markdown links
      .replace(/[*_`#>~-]/g, "") // strip markdown formatting
      .slice(0, 300) || // limit to 300 characters
    ""
  ); // fallback to empty string
}

export async function GET() {
  const videos = allVideosFilteredAndSorted;

  // Render the markdown to access the body content
  await Promise.all(
    videos.map(async (video) => {
      // Convert the markdown body to plain text for description
      if (video.body) {
        video.renderedDescription = extractFirstParagraph(video.body);
      }
    })
  );

  // Determine the base URL depending on whether it's in DEV or PROD
  const baseUrl =
    import.meta.env.MODE === "development"
      ? "http://localhost:3000" // Default dev URL
      : import.meta.env.SITE; // Production URL from the environment config

  const urlset = {
    url: videos.map((video) => {
      const data = video.data;
      const description = extractFirstParagraph(data);

      return {
        loc: `${baseUrl}/video/${video.slug}/`, // Absolute URL based on the environment
        "video:video": {
          "video:thumbnail_loc": new URL(
            data.poster?.src || data.image?.src || "",
            baseUrl
          ).toString(), // Absolute URL for thumbnail
          "video:title": { "#text": data.title },
          "video:description": {
            "#text": video.renderedDescription || description || data.title,
          },
          ...(data.videoUrl && {
            "video:player_loc": new URL(data.videoUrl, baseUrl).toString(), // Absolute URL for player_loc
          }),
          ...(data.duration && {
            "video:duration": timeToSeconds(data.duration),
          }),
          ...(data.publishedAt && {
            "video:publication_date": new Date(data.publishedAt).toISOString(),
          }),
          ...(video.data.tags?.length && {
            "video:tag": video.data.tags,
          }),
        },
      };
    }),
  };

  const builder = new XMLBuilder({
    format: true,
    suppressEmptyNode: true,
    // Customizing how the XML output is generated to ensure we can inject namespaces
    rootNodeNames: { urlset: "@xmlns" },
  });

  let xml = builder.build({
    urlset: urlset,
  });

  // Extract the closing tag before replacing the opening tag
  const closingTag = "</urlset>";

  // Manually inserting namespaces at the top of the XML
  xml = xml.replace(
    "<urlset>",
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
    xmlns:xhtml="http://www.w3.org/1999/xhtml">`
  );

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
