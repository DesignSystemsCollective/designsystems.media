import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import pagefind from "astro-pagefind";
import sitemap from "@astrojs/sitemap";

import react from "@astrojs/react";
import keystaticAstro from "@keystatic/astro";

import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  site: "https://designsystems.media",
  integrations: [mdx(), sitemap(), pagefind(), react(), keystaticAstro()],
  output: "hybrid",
  adapter: netlify(),
});
