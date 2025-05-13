import mdx from "@astrojs/mdx";
import sitemap from "astro-sitemap";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import { defineConfig, passthroughImageService } from "astro/config";

import react from "@astrojs/react";
import keystaticAstro from "@keystatic/astro";

import netlify from "@astrojs/netlify";

const sitemapConfig = {
  // print date not time
  lastmodDateOnly: true,

  // set the xml namespace
  xmlns: {
    xhtml: true,
    news: false,
    image: false,
    video: true,
  },

  serialize(item) {
    if (/video/.test(item.url) && item.data?.video) {
      const videoData = item.data.video;

      item.changefreq = EnumChangefreq.DAILY;
      item.lastmod = new Date().toISOString();
      item.priority = 0.9;

      item.video = [
        {
          thumbnail_loc: videoData.thumbnail,
          title: videoData.title,
          description: videoData.description,
          player_loc: videoData.player,
          "player_loc:autoplay": videoData.autoplay ? "ap=1" : undefined,
          "player_loc:allow_embed": videoData.allowEmbed ? "yes" : undefined,
        },
      ].filter(Boolean); // remove undefined
    }

    return item;
  },

  createLinkInHead: true,
};

// https://astro.build/config
export default defineConfig({
  site: "https://designsystems.media",
  integrations: [
    mdx(),
    sitemap(sitemapConfig),
    pagefind(),
    react(),
    keystaticAstro(),
    icon(),
  ],
  description:
    "A curated collection of design systems videos, tagged with speakers and topics for easy discovery.",
  output: "static",
  adapter: netlify(),
  image: {
    service: passthroughImageService(),
  },
  trailingSlash: "always",
});
