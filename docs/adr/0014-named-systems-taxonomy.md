# ADR 0014: Add a `systems` taxonomy for named design-system products

## Status

Accepted, implemented alongside this ADR.

## Context

While reviewing what was left in the unmapped-tags list after the series/topics/tools migration (ADR 0012/0013), a recurring pattern of company names showed up: GOV.UK (5 tag applications), Government (4), Spotify (2), WhatsApp (2), Omlet (2), and single mentions of IKEA, Airbnb, Atlassian, Salesforce, Uber, Deliveroo, Apple, and Adobe.

ADR 0012 already considered this and recommended against it:

> One-off company/case-study mentions (GOV.UK, Spotify, Airbnb, IKEA, Salesforce, Atlassian, NASA, Adobe, Uber, etc.) are recommended to **not** become tags — the list is open-ended, nearly every one is used once, and they're better served by full-text search over title/description than by a taxonomy entry.

That reasoning holds for a plain company-name facet: most of the raw tag hits above are singletons, and "which companies get mentioned" is open-ended in a way the closed-vocabulary approach is specifically designed to avoid.

But a company name isn't actually the right unit for a site cataloging design systems. Checking the actual video titles (not just the sparse company tags) surfaced a different, better-fitting pattern: entries about a specific **named design-system product** — "IKEA's Design System Skapa," "Inspect & Reflect: Adobe's Spectrum Design System," "DSW Day 2023 - Design System Showcase: Spotify's Encore," "Uber Base," "Salesforce's Lightning Design System," "Github Primer Design System." These aren't incidental company mentions; they're the actual subject of the video, and the product name (Skapa, Spectrum, Encore, Base, Lightning, Primer) is often more specific and more searched-for than the parent company.

Title research (not raw tags, since most of these were never tagged with the product name at all) found 15 such entries:

| System | Company | Entries |
|---|---|---|
| Spectrum | Adobe | 4 |
| GOV.UK Design System | GOV.UK | 4 |
| Encore | Spotify | 2 |
| Skapa | IKEA | 1 |
| Base | Uber | 1 |
| Lightning Design System | Salesforce | 1 |
| Primer | GitHub | 1 |
| Fluent UI | Microsoft | 1 |
| Carbon | IBM | 1 |
| Canvas | Scotiabank | 1 |
| Human Interface Guidelines | Apple | 1 |
| Atlassian Design System | Atlassian | 1 |
| Airbnb Design System | Airbnb | 1 |
| WhatsApp | WhatsApp | 1 |
| Polaris | Shopify | 1 |

Notably, Polaris (Shopify's design system) surfaced only through title research — the "Managing design systems in the open" video about Shopify/polaris-react was never tagged with a company name at all, so a tag-migration-only approach would have missed it entirely.

Excluded from this list: raw company tags that turned out, on inspection, not to be about that company's design system specifically — "Into Design Systems LIVE from Meta in London" is tagged `WhatsApp` but is just a meetup hosted at Meta's office, not a talk about WhatsApp's design system (the separate "Design Systems: The Whats App Way" entry is the real one). Also excluded: `Government` (4 tag applications) — a sector descriptor across multiple countries' public-sector talks, not a specific product. `Omlet` (2 tag applications) is reclassified as a `tools` entry instead — it's a design-system analytics tool, not a company or a system.

## Decision

Add a fourth closed taxonomy, `systems`, to `taxonomy.ts` alongside `SERIES`/`TOPICS`/`TOOLS`, following the exact same single-source-of-truth pattern: exported `as const` array, imported into `content.config.ts`'s Zod enum and into a Front Matter CMS `customTaxonomy` entry.

Naming: the facet is called `systems` / "Systems" in code, nav, and URLs (`/systems/`), not "Design Systems" — every page on this site is already about design systems, so that label would be redundant in navigation. The taxonomy values themselves are the specific product names (Skapa, Spectrum, Encore, ...), with the parent company as necessary context baked into names that don't have their own distinct brand (Atlassian Design System, Airbnb Design System, GOV.UK Design System, WhatsApp).

Migration: because these entries were identified by title research rather than by an existing tag that maps cleanly, this is a one-time manual mapping (15 entries) rather than a tag-lookup pass like series/topics/tools. Going forward, new entries about a named system should get tagged at creation time, same as any other taxonomy field.

Navigation placement mirrors `tools`, the closest precedent: not in primary header nav (a 15-term, cross-reference-oriented facet doesn't earn a top-level nav slot any more than Tools' 12 terms did), included in the footer browse row. No homepage "Popular systems" card for now — the dataset is real but still small (20 entries), and the existing three homepage cards (topics/series/tools) already represent facets with materially more content behind them. Revisit once the systems list grows past its initial batch.

## Consequences

New surface area: `/systems/` index and detail pages (mirroring `/tools/`'s A-Z list pattern), a footer link, `MetaItem.astro` gains a `systems` prop, and `MediaPost.astro`/`ShowLayout.astro` render it as a fourth facet row. `residualTags` dedup (ADR 0012/0013's fix for legacy tags duplicating a migrated facet) extends to cover `systems` too.

This is a genuine reversal of one specific recommendation in ADR 0012 (no company/case-study taxonomy) — recorded here rather than silently overridden, per this repo's ADR convention of narrow documents that cross-reference rather than silently supersede each other. The reversal is scoped narrowly: this ADR is about named *systems*, not companies in general: a video that merely mentions a company in passing still isn't a candidate for this taxonomy, only ones that are actually about that company's specific design-system product.

## Open questions

- Whether to backfill more entries once the AI tagging pipeline (see ADR 0012's Maintenance section) can reliably extract a named system from a transcript, rather than relying on manual title research.
- Whether a homepage card is warranted once the systems list grows - no fixed threshold set, revisit qualitatively.
- Whether `Government` (public-sector talks spanning multiple countries) deserves its own `topics` entry - excluded from this ADR as out of scope, flagged for a future topics review.
