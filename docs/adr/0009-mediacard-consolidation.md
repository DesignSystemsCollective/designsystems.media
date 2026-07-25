# ADR 0009: Shared `MediaCard` base component

## Status

Accepted

## Context

`VideoCard.astro`, `PodcastCard.astro`, and `ShowCard.astro` duplicated the bulk of their structural markup and CSS — `.media-item`/`.media-link`/`.media-content` wrappers, the title element, and an identical hover glow (`box-shadow`/`outline` on the image, color shift on the title) — confirmed by reading all three during the 2026-07-08 audit that produced the refactor plan. Only the type-specific bits genuinely differed: image resolution logic, aspect ratio, and which extra metadata renders (duration vs. episode count vs. show link).

Phase 6a (ADR 0007) added a deterministic `/dev/visual-fixtures/` route and closed the coverage gaps in the existing visual suite — grid-layout `VideoCard`/`PodcastCard` and `ShowCard` had zero unmasked screenshot coverage before that — specifically so this phase would have a trustworthy regression safety net before touching shared card markup.

## Decision

Extract `src/components/media/MediaCard.astro` as the shared base. It owns the wrapper (`.media-item`/`.media-link`), the title (plain text or linked, via an optional `titleHref` prop), and the hover-glow CSS. `VideoCard`/`PodcastCard`/`ShowCard` each become a thin wrapper that passes type-specific props and fills three named slots: `image`, `subtitle` (optional), and `meta`.

**Why the image stays a slot instead of moving into `MediaCard`:** aspect ratio, duration badge, and image-source resolution differ enough per card type that sharing the markup wasn't worth it, and each card's own `<style>` block already scopes its image CSS correctly. Astro's scoped CSS only applies to elements a component renders directly, not to slotted content — so `MediaCard`'s `<style>` block can't reach into the image without `:global()`. The one place shared CSS needs to cross that boundary (the hover glow on the image) uses `:global(.media-image img)` deliberately, which requires every card to keep the literal `media-image` class on its slotted image wrapper — all three already did, so this was a zero-cost constraint.

**`.meta` stays owned by each card, not `MediaCard`, despite being visually identical in structure.** An earlier version of this file wrapped the `meta` slot in a `MediaCard`-owned `<div class="meta">` so the font-size/color rule could live in one place. That extra layer of indirection introduced a small, hard-to-pin-down spacing diff caught by the Phase 6a fixture-route screenshots. Rather than chase it, each card now renders its own `<div class="meta">` directly (matching its pre-refactor markup exactly) and owns its own `.meta` CSS rule — 14px/13px (show variant) duplicated three ways. A small, deliberate duplication traded for a structure that's provably identical to what shipped before.

**Two behavior-preserving quirks kept as explicit props, not "corrected":**
- `listAlign` ("center" | "start") — `VideoCard` used `center`, `PodcastCard` used `start` (its longer three-line content — title, show name, meta — centers awkwardly against a short image). Both preserved.
- `mobileGridColumns` ("1fr-4fr" | "2fr-3fr") — `PodcastCard`/`ShowCard` use the default `1fr 4fr`; `VideoCard`'s original CSS had two competing same-specificity rules where a later `.media-link` rule silently overrode `.media-grid-layout`, so its *effective* mobile ratio was actually `2fr 3fr`. Kept as-is via this prop rather than fixed, since this is a behavior-preservation pass, not a redesign.

**`ShowCard` wraps `MediaCard` in its own `<a>` from the outside rather than changing `MediaCard`'s root element.** `VideoCard`/`PodcastCard` have separate image and title links (so `MediaCard`'s wrapper can be a plain `<div>`), but `ShowCard` has always been one link covering the whole card. `MediaCard` exposes a `titleHref` prop for the two-link cards and simply omits it for `ShowCard`, which supplies its own outer `<a class="show-link">` instead — no conditional root-element logic inside `MediaCard` itself.

**Incidental fixes made while the files were open, not part of the consolidation itself:** `MediaGrid.astro` had a stray extra `}` in `gridItemMinWidth={gridItemMinWidth}}` (dead syntax, harmless but wrong), and `MediaImage.astro` had the same typo in a `Badge label={formatDuration(duration)}}` prop. Both fixed alongside, same as prior phases' practice of fixing small things noticed in passing (see ADR 0003's precedent).

## Consequences

- Net effect across the three card files: 292 lines removed, 93 lines of prop-passing/slot markup added, against one new 163-line shared component — the duplicated hover-glow/wrapper CSS now exists exactly once.
- Verified behavior-preserving via `npm run test:unit` (56/56 passing, unchanged) and a full production `astro build` (2559 pages, zero errors) — spot-checked rendered output confirms all three card types and both layouts produce the expected class combinations (`media-grid-layout media-mobile-cols-2-3` for `VideoCard`, `media-list-layout media-list-align-start` for list-layout `PodcastCard`, `media-grid-layout media-show` for `ShowCard`) and that `subtitle`/`meta` slotted content renders correctly.
- **The `test:visual` baseline comparison against the Phase 6a fixture route still needs to run locally**, same constraint ADR 0007 already recorded: snapshots are OS-specific (`-darwin` in this repo) and can't be meaningfully generated from a Linux sandbox. This isn't a new gap introduced by this phase — build-level and markup-level verification were done here since a real screenshot diff wasn't available in this environment; running `test:visual` (not `:update`) locally and inspecting every diff manually before accepting it remains the last verification step before merging.
