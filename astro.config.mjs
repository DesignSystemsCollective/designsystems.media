import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import pagefind from "astro-pagefind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://designsystems.media",
  integrations: [
    mdx(),
    sitemap({
      filter(page) {
        // /dev/ - internal-only pages (e.g. the visual-regression card
        // fixture route added in Phase 6a) that should never be indexed
        // or listed.
        return !/video/.test(page) && !/\/dev\//.test(page);
      },
    }),
    pagefind(),
    react(),
    icon(),
  ],
  description:
    "A curated collection of design systems videos, tagged with speakers and topics for easy discovery.",
  output: "static",
  adapter: netlify(),
  trailingSlash: "always",
  exclude: ["src/pages/generate-social-mosaics.astro"],
});
