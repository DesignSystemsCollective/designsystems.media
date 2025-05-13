import mdx from "@astrojs/mdx";
import sitemap from "astro-sitemap";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import { defineConfig, passthroughImageService } from "astro/config";

import react from "@astrojs/react";
import keystaticAstro from "@keystatic/astro";

import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  site: "https://designsystems.media",
  integrations: [
    mdx(),
    sitemap({
      filter(page) {
        return !/video/.test(page);
      },
    }),
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
