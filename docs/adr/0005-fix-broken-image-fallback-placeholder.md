# ADR 0005: Fix the broken image-fallback placeholder in getImages.js

## Status

Accepted

## Context

`getImages.js` downloads remote thumbnail/poster images into each content folder as `poster.jpg`. When a download failed after retries (`MAX_RETRY_COUNT = 3`), four call sites - `processShowMarkdownFile`, `processEpisodeMarkdownFile`, and two branches inside the legacy `processMarkdownFile` (which handles media/video entries) - fell back to setting `data.image` (and, for media, `data.poster`) to `./hqdefault.jpg`, then marked `localImages: true`.

The refactor plan's original audit described this as a "silently dangling reference." Investigating it turned up something more serious: no code anywhere in this repo writes a file called `hqdefault.jpg`. It's a leftover convention from an older, now-gone pipeline. Reading Astro's actual `image()` schema helper (`node_modules/astro/dist/content/runtime-assets.js`) confirmed it always resolves the field's value as a local file path at build time via Vite's resolver, and throws a **fatal** validation error if that resolution fails - it does not accept remote URLs, and it doesn't degrade gracefully for a missing local file either. So the old fallback wasn't cosmetic debt; it was one failed download away from breaking the production build the next time that content file happened to get touched (schema re-validation runs on every build, not just on ingestion).

Marking `localImages: true` on the fallback path compounded this: it told future aggregator runs "this is handled," permanently suppressing any retry of the download.

A related, second bug (folded into this same fix at Frank's request): `src/utils/generateSocialImages.ts` built its social-mosaic images by checking `["maxresdefault.jpg", "hqdefault.jpg", "poster.jpg"]` in that order. Since the current pipeline only ever produces `poster.jpg`, and a repo-wide check confirmed 0 folders have either legacy filename without `poster.jpg` also present, this order meant every folder with legacy files present used a stale, wrong image over the current one - never a build failure, but consistently wrong output.

## Decision

**getImages.js:** on download failure, remove the broken reference instead of pointing it at a placeholder that doesn't exist, and leave `localImages: false` so a future aggregator run retries the download rather than being permanently stuck:

- Media (`processMarkdownFile`, both branches) and show (`processShowMarkdownFile`) fields are `.optional()` but not `.nullable()` in the content schema, so the field is `delete`d entirely.
- Podcast episode `image` is `.nullable().optional()`, and the codebase already uses explicit `null` for "no image" on episodes (see ADR 0004/Phase 2's `generateEpisodeMdx`), so the episode fallback sets `data.image = null` to match that existing convention rather than deleting the key.

**A second fix bundled in while touching this code:** the episode-image failure path had its own fallback-to-show-poster logic (`../show/${showSlug}/poster.jpg`), which assumed that file existed without checking. If the show's own image download had also failed, this would have chained one broken reference into another. Added an `fs.existsSync` check before using this fallback; if the show poster genuinely isn't there, the episode falls through to the same "clear it and let a future run retry" behavior described above.

`getImages.js` also gained a `require.main === module` guard and `module.exports` (matching the pattern established for the other video-aggregator scripts in Phases 0-3), since it previously ran its top-level `processInOrder()` unconditionally on `require()`, making it untestable. It had zero test coverage before this change; `src/tests/unit/video-aggregator-images.test.mjs` now covers all four fallback branches plus `updateMarkdownFile`'s handling of deleted/null keys.

**generateSocialImages.ts:** reordered to `["poster.jpg", "maxresdefault.jpg", "hqdefault.jpg"]`, and the priority-search logic was extracted into a new, dependency-free `src/utils/findFirstExistingImage.ts` (importing `generateSocialImages.ts` directly in a Node test fails - it pulls in `astro:content` via `content-domain`, which only resolves inside Astro's own build pipeline - so the only way to unit test this logic at all was to pull it out). Covered by `src/tests/unit/findFirstExistingImage.test.ts`.

## Consequences

- Content files that previously would have received the `./hqdefault.jpg` placeholder on a failed download will now have `image`/`poster` absent or `null` instead, and `localImages: false`, so the next aggregator run retries them automatically. No existing content files were touched by this change - it only affects the failure path going forward.
- The episode-to-show-poster fallback is now slightly more conservative (it can fall through to "no image" in a case where it previously would have written a reference that might not resolve), which is the correct tradeoff given Astro's fatal-on-unresolvable-path behavior.
- `getImages.js` and `generateSocialImages.ts`'s image-selection logic both have real test coverage for the first time.
- Scope stayed narrow: `updateMarkdownFile`'s separate, non-`writeContentFile` frontmatter serializer (a fourth independent implementation of the same "write frontmatter to disk" concern that Phase 2/ADR 0003 unified the other three of) was noted but deliberately not touched here - unifying it is a separate decision with its own blast radius, not a side effect of fixing this bug.
