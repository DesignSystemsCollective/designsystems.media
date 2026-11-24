# designsystems.media

Astro static site that catalogs design systems videos and podcasts. Content is MDX files with strict frontmatter. A sibling repo, `dsmedia-ai-agent`, ingests and tags content for this site.

## Content rules

- Collections live in `src/content/` as `media`, `podcast`, `show`, and `playlists`. Each entry is a folder with an `index.mdx` (playlists are flat `.mdx` files).
- The frontmatter schema is in `src/content.config.ts`. Do not loosen it to make an entry pass. Fix the entry.
- `series`, `topics`, `tools`, and `systems` are closed lists. They are defined in `src/lib/content-domain/taxonomy.ts` and repeated as options in `frontmatter.json`. Change both files together, or the CMS and the schema disagree.
- A value that is not in a closed list goes in the freeform `tags` field. Never add a value to a closed list as a side effect of tagging one entry. Adding a value is a separate decision and gets an ADR (see ADR 0012 and ADR 0014).
- `speakers` is a controlled list in `frontmatter.json`. Never invent a speaker name. If a name does not match an existing one exactly, leave `speakers` empty and report the name for manual review.
- Do not touch `.env`. Never commit secrets.

## Code rules

- Pages, APIs, and components read content only through `src/lib/content-domain`. Do not call `getCollection()` from route files (ADR 0001).
- Record major decisions as a numbered file in `docs/adr/`. Read the latest ADRs on the same topic before changing related code.

## Checks before committing

- `npm run validate:content` runs before every build and must pass.
- `npm run test:unit` for logic changes.
- `npm run test:smoke` when pages, routes, or links change.
- Visual snapshot tests (`npm run test:visual`) compare screenshots. Run `npm run test:visual:update` only after an intended UI change, and say so in the commit message. Do not update snapshots to make a failing test pass.

## Ingest

- `npm run aggregate` fetches new videos. Scheduled GitHub workflows run the aggregators and open pull requests. Review those pull requests before merging.
- `content-aggregator/data/ignore.json` lists video URLs the video aggregator skips. `podcast-ignore.json` does the same for podcasts. `ignoreID.json` lists video IDs and is read by `src/pages/private/reference.json.js`, not by the aggregators. Update every list that applies when you ignore a video.
- Tagging uses `dsmedia-ai-agent` (`classify_taxonomy`, `retag_site_media`). `retag_site_media` is a dry run unless `--apply` is passed. Always review a dry-run report before applying.
