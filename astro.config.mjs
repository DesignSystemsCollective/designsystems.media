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
  // @astrojs/netlify defaults to routing <Image>/<Picture> output through
  // Netlify's on-demand Image CDN (/.netlify/images?url=...), which only
  // resolves once actually deployed to Netlify's edge - a local `astro
  // build` + static preview (what smoke/visual tests and `astro preview`
  // use) has nothing to answer that endpoint, so every image 404s. This
  // site is fully static with no on-demand rendering, so there's no
  // benefit to the on-the-fly CDN transform anyway - opt back into
  // Astro's built-in (sharp-based) image service, which processes and
  // embeds final images at build time like it always has.
  adapter: netlify({ imageCDN: false }),
  trailingSlash: "always",
  exclude: ["src/pages/generate-social-mosaics.astro"],
});
