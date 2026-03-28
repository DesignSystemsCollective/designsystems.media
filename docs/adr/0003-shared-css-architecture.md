# ADR 0003: Organize shared CSS primitives while keeping unique styles local

## Status

Accepted

## Context

Styling had drifted toward repeated component-local `<style>` blocks. High-traffic UI surfaces such as cards, metadata rows, detail layouts, section headers, and taxonomy headers repeated the same CSS patterns with only small local differences.

This duplication made small UI changes slower and riskier because several components needed to stay visually aligned by convention rather than by shared primitives.

## Decision

We kept Astro component-local styles for one-off presentation details, but extracted repeated patterns into shared stylesheets under `src/styles/` and imported them through `src/styles/global.css`.

The shared layer now covers:

- `src/styles/layout/` for page-level content-shell, detail-page meta/prose layout, and taxonomy layout primitives
- `src/styles/components/cards.css` for shared card structure, shared list-card layout, and hover treatment
- `src/styles/components/meta.css` for metadata primitives, taxonomy links, and badges
- `src/styles/components/sections.css` for section and card header structure

Shared layout ownership is intentionally centralized:

- `BaseLayout` owns page shell behavior, including the desktop sidebar layout and its `1024px` collapse
- `ResponsiveGrid` owns collection layout behavior, including the `768px` single-column collapse for grids
- `content.css` owns the common detail-page content shell, title width/padding, and meta-to-prose collapse at `1024px`

This also means reusable components should not introduce competing layout shifts:

- cards now support only two structural families, `grid` and `list`
- the old mobile-only card rewrites were removed so cards no longer change structure independently of their container
- metadata layout is shared through `meta.css` and detail-page shell helpers instead of being redefined in each template

Component-local `<style>` blocks remain the place for styles that are unique to a single component, such as hero treatments, artwork presentation, line clamping, episode-table styling, or one page-only spacing rules.

## Consequences

Repeated CSS is reduced and shared UI patterns are easier to evolve consistently.

`src/styles/global.css` now acts as the root style entrypoint and should stay focused on global base rules plus shared imports, rather than absorbing more page-specific styling.

The responsive system is simpler and more predictable:

- `1024px` is the main page-structure breakpoint for sidebar and detail layouts
- `768px` is the collection-grid and mobile-navigation breakpoint
- `425px` remains a compact-density breakpoint rather than introducing new structural layout changes

This approach keeps the existing desktop compositions intact, but it introduces a clearer expectation: when a styling change affects reusable UI structure, visual regression tests should be run to verify the shared primitives did not introduce unintended diffs elsewhere.
