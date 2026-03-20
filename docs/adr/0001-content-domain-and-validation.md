# ADR 0001: Centralize content loading, indexing, and validation

## Status

Accepted

## Context

The site had accumulated repeated Astro collection queries across route files, utilities, and metadata code. Tags, speakers, shows, playlists, stats, and sitemap generation each reloaded and reshaped overlapping content independently.

As the content set grew, repeated collection scans became a maintainability problem first and a build-cost problem second. The build also failed late when content referenced missing local assets, which made invalid content harder to diagnose.

## Decision

We introduced a shared content-domain layer under `src/lib/content-domain/` and moved Astro collection access behind that boundary.

The content-domain layer now:

- loads collections once through dedicated loaders
- normalizes dates, slugs, tags, and speakers in one place
- builds shared derived indexes and selectors for pages and APIs
- exposes a stable internal query surface such as `getSiteStats()`, `getTaxonomyIndex()`, `getTaxonomyPage()`, `getShowPage()`, and playlist queries

We also added prebuild content validation so missing local assets, duplicate slugs, broken playlist references, and unknown `showSlug` values fail before `astro build`.

## Consequences

Pages and APIs no longer query Astro collections directly and instead depend on the shared content-domain contract.

This reduces duplicated indexing logic and makes route behavior more consistent, but it also means content-domain selectors now carry more responsibility and need focused unit coverage.

Build failures now happen earlier and with more actionable validation output, at the cost of an extra explicit validation step during build and local verification.
