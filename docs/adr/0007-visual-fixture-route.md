# ADR 0007: A deterministic visual-fixture route for card components

## Status

Accepted

## Context

Phase 6 of the refactor plan will extract a shared `MediaCard` base component from `VideoCard.astro`/`PodcastCard.astro`/`ShowCard.astro`, which currently duplicate the bulk of their markup and CSS. That refactor needs a visual regression safety net to be trustworthy, and auditing the existing suite (ADR 0002) against exactly what it renders turned up real gaps:

- `VideoCard`/`PodcastCard` in **grid** layout - the default arrangement on the homepage, `/all/`, and `/podcast/` - is masked out everywhere it appears (`maskHomeDynamicRegions`, `maskAllResponsiveContainers`). Those masks exist deliberately, to avoid screenshot churn on data-driven listings (ADR 0002) - but the practical effect is **zero visual coverage of the grid layout today**.
- `ShowCard` only renders via `ShowGrid` on `/show/` (not a curated visual route at all) and on `/podcast/` (masked, same reason as above). **Zero unmasked coverage anywhere.**
- List layout has real unmasked coverage today (`/tags/design-tokens/`, `/speakers/jina-anne/`, `/playlists/ai-and-design-systems-starter/`), but those are still live-content routes: newly-ingested content defaults to `draft: true` and gets filtered out of taxonomy pages, which is why they've stayed stable in practice - an implicit assumption the suite relies on, not a structural guarantee.

Grid layout and `ShowCard` are exactly what Phase 6 touches. Using the existing suite as-is would silently pass a real regression in either.

## Decision

Add a dedicated fixture route, `/dev/visual-fixtures/` (`src/pages/dev/visual-fixtures.astro`), that renders `VideoCard`, `PodcastCard`, and `ShowCard` directly with fixed, hard-coded props, in both grid and list layout (`ShowCard` has no list variant anywhere in the codebase, so it's shown once, grid only). Screenshotted unmasked, full page, at both viewports (`card-fixtures.png` under `visual-desktop`/`visual-mobile`), added as a tenth route in `src/tests/visual/routes.ts` and a tenth test in `ui.visual.spec.ts`, alongside the existing nine.

This is deterministic by construction: nothing about it depends on the live content collection, so it can't drift as new videos/podcasts get published, unlike the "implicit assumption" list-layout coverage described above. It's also a more direct test of the three components Phase 6 is refactoring than any live route gives today, since every prop is visible and intentional rather than whatever happens to be true of the most recent 2-3 real content items.

Specific choices worth recording:

- **Dates are hard-coded to a past year, not the current one.** `formatDate` omits the year when a date falls in the current calendar year (`"Jan 1"` vs. `"Jan 1, 2024"`). A fixture dated in the current year would silently change its rendered string - and therefore its screenshot - the moment the calendar rolls over to next year, which is exactly the kind of drift this route exists to eliminate. Using a fixed past year (2024) makes the rendered date string permanent regardless of when the suite runs.
- **The poster image is a real local asset (`src/assets/visual-fixtures/fixture-poster.jpg`), not a remote URL or a fake path.** A generated solid-color JPG (via `sharp`, already a project dependency), imported the same way a real content entry's `image()` schema field resolves. This exercises the cards' real `<Image>`/`ImageMetadata` code path rather than a remote-URL fallback branch or a broken image - remote URLs would also make the build depend on network access during image processing, which this route is specifically trying to avoid.
- **One narrow, deliberate exception to "no live-content dependency": link targets.** `VideoCard`/`PodcastCard`/`ShowCard` each build their own `<a href>` from a `slug`/`showSlug` prop, and the smoke suite (`pages.smoke.spec.js`) makes a real HTTP request to every internal link on every built page, failing on a 404. A fully invented slug like `fixture-video-one` would break *smoke* coverage (a broken link) while looking fine in a screenshot. Rather than invent a slug and then have to explain away a smoke failure, the fixture route reuses the same three routes `VISUAL_ROUTES` already hardcodes as stable fixtures elsewhere in this exact suite (`clarity-2018-recap`, `26-dominic-nguyen-storybook-and-chromatic`, `design-systems-podcast`) - accepting a risk this codebase's own test suite already accepts, rather than introducing a new one. Every *visible* prop (title, dates, duration, image, speaker names) stays fully hard-coded; only where the link points depends on real content continuing to exist at that URL.
- **Excluded from the sitemap and not linked from nav.** `astro.config.mjs`'s sitemap filter gained a `/dev/` exclusion alongside its existing `/video/` one. Nav is hand-written in `Header.astro` (not derived from the page tree), so a new page was never at risk of appearing there automatically. As a second layer, `Metadata.astro` gained a `noindex` prop (`false` by default, so no existing page's behavior changes) that this route sets to `true`.

## Consequences

- Once this route's baseline is captured (`test:visual:update`, run once by Frank locally - screenshots are OS-specific, `-darwin` in this repo's existing snapshots, and can't be meaningfully generated from this Linux sandbox), `test:visual` run standalone should show all ten routes clean before Phase 6 starts. Per the plan: run `test:visual` (not `:update`) after each Phase 6 change, inspect every diff manually, and only accept intentional ones with `:update`.
- If the three borrowed real slugs (`clarity-2018-recap`, `26-dominic-nguyen-storybook-and-chromatic`, `design-systems-podcast`) are ever renamed, unpublished, or deleted, this route's smoke-test link check breaks (not its visual screenshot) - the same failure mode `VISUAL_ROUTES`'s own detail-page routes already have today. Worth revisiting if those ever change, but not a new category of fragility this route introduces.
- `Metadata.astro`'s new `noindex` prop and `astro.config.mjs`'s sitemap filter are both small, additive, backward-compatible changes - no existing page's rendered output or sitemap inclusion changes as a result.
