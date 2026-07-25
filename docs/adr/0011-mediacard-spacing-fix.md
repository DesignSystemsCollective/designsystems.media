# ADR 0011: Fix MediaCard title/meta spacing regression from Phase 6

## Status

Accepted

## Context

Phase 6 (ADR 0009) consolidated `VideoCard`/`PodcastCard`/`ShowCard`'s duplicated wrapper, title, and hover-glow markup/CSS into a single shared `MediaCard.astro`. ADR 0009 already flagged one spacing casualty of that consolidation - wrapping `.meta` in a `MediaCard`-owned div introduced a "small, hard-to-pin-down spacing diff," which is why each card went back to owning its own `.meta` rule locally. That fix didn't catch everything: on this branch (commit `a338007f`, Phase 11), `test:visual` turned up 11-12 failures - `home`, `podcast-index`, `tag-detail`, `speaker-detail`, `playlist-detail`, and the `card-fixtures` route (ADR 0007), across both viewports - all tracing back to `MediaCard.astro`'s `.media-content { gap: 2px }`.

Git history for the pre-Phase-6 commit (`47cb4afe`, the last commit before Phase 6) wasn't reachable from the environment this was investigated in, so the fix was root-caused a different way: by reading `.media-content`'s computed styles directly off production (`designsystems.media`), which was still running the three pre-consolidation components at the time. That comparison showed the original cards didn't share one spacing approach - they used two different ones that happened to both land on the same visual result:

- **`VideoCard`**: `.media-content { display: block }` - no flex, no `gap` property at all. Its ~2px title-to-meta spacing came entirely from `.title`'s own `margin: 2px 0` collapsing in normal block flow (`.meta` carries no margin of its own).
- **`PodcastCard`/`ShowCard`**: `.media-content { display: flex; gap: 2px }`, but `.title { margin: 0 }`. Their spacing came entirely from the flex `gap`, applied uniformly to both the title→subtitle and subtitle→meta boundaries.

Phase 6's consolidation merged all three into one flex-based `.media-content`, but carried over *both* leftover mechanisms - `.title`'s `margin: 2px 0` (`VideoCard`'s mechanism) stacked on top of a `gap: 2px` (`Podcast`/`ShowCard`'s mechanism) - instead of recognizing they were two ways of expressing the same original 2px and picking one. The result roughly doubled the effective spacing on every card type (title→meta on `VideoCard`; both boundaries on `Podcast`/`ShowCard`, asymmetrically, since only the title side carried the extra margin).

## Decision

Standardize on the flex-gap mechanism, since the shared component is already flex-based: `.media-content { gap: 2px }` with `.title`'s margin removed (`margin: 0`). This reproduces the original ~2px spacing for both card families from a single rule - directly via the gap for `VideoCard`'s title→meta pairing, and uniformly via the gap for `Podcast`/`ShowCard`'s title→subtitle→meta pairing - rather than requiring per-card-type tuning the way the pre-Phase-6 code implicitly did.

Verified two ways: against production's live computed styles directly (see above), and empirically via the `card-fixtures.png` baselines (`test:visual`) before and after the change, which converged on the fix rather than drifting further from it.

## Consequences

- Resolves the `.media-content` root cause behind the Phase 11 `test:visual` failures. New baselines accepted via `test:visual:update` across all affected routes/snapshots.
- On narrow (mobile) viewports, some cards' row heights shrink slightly more than others depending on whether the row's height is set by its image or by its text content - a pre-existing width-dependent trade-off in the responsive grid (`MediaCard`'s `.media-list-layout`/`.media-grid-layout` mobile rules), not something this fix introduces. Investigated directly (via a same-origin iframe render of `/dev/visual-fixtures/` at ~389px) to rule out a real regression - e.g., `ShowCard`'s fixture poster was suspected of not rendering at mobile width, but it renders correctly at 68×68px; it was only hard to spot in the light-mode test screenshot because that particular poster has a white background.
- This was root-caused against production rather than against `47cb4afe` directly, since git access wasn't available in the investigating environment. Worth a quick diff against that commit if/when convenient as a second confirmation, though the production-verified fix is not expected to differ from it - production was, at the time of this investigation, still running that pre-Phase-6 code.
