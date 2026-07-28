# ADR 0013: Navigation and information architecture for the series/topics/tools split

## Status

Proposed — not yet implemented. Depends on ADR 0012 being accepted first; this ADR only makes sense if `tags` is actually split into `series`/`topics`/`tools`.

## Context

ADR 0012 splits the freeform `tags` field into three controlled taxonomies. That's a data-model decision, but it has direct consequences for how visitors browse the site, which is a separate set of choices worth reviewing on its own.

Current state, verified against the live site:

- Header nav (`Header.astro`) is Videos / Podcasts / Tags / Speakers.
- `/tags/` (`src/pages/tags/index.astro`) is a single alphabetical list of all ~564 tags with letter-jump navigation — a layout that made sense for a flat freeform list, not for a curated ~45-term vocabulary.
- The sidebar (`Sidebar.astro`) lists Tags and Speakers with counts, but is hidden entirely below 1024px (`display: none`) with no mobile equivalent — a pre-existing gap, not something ADR 0012 introduces.
- The homepage's third "Popular" card is labeled "Popular events" but links to plain tag pages for conference names (Clarity, Design Systems London, DSW Day) — live evidence that series-like values are already being treated as a fourth facet without a real home.
- `MetaItem.astro` renders tags as one comma-separated line of plain-text links.

Comparable-site research (Frontend Masters, Smashing Magazine, Component Gallery) informed the approach below: Frontend Masters' "Paths" — a small, curated, closed list surfaced in primary nav — is the closest analog to `series`. Smashing Magazine keeps its ~30-term topic list out of primary nav entirely, closer to the treatment proposed here for `tools`.

## Decision (proposed)

- **Header nav** becomes Videos / Podcasts / Topics / Series / Speakers. `Tools` is deliberately left out of the top nav — at ~12 candidate values (versus ~45 topics, 15 series) it's a smaller, denser, more cross-reference-oriented facet ("everything mentioning Figma Variables") than a primary way people browse, and a sixth header item pushes the nav into its hamburger fallback sooner on tablet widths.
- **`/topics/` index** replaces the current A–Z alphabetical sprawl with a single curated view sized by usage (larger label = more content behind it). ~45 curated topics don't need an alphabet scrollbar the way 564 raw tags did.
- **`/series/` and `/tools/` index pages** are added, mirroring the `getTaxonomyIndex`/`getTaxonomyPage` pattern already shared by `/tags/` and `/speakers/` today.
- **Sidebar** gains a third `<details>` section for Tools alongside the renamed Topics and existing Speakers sections. Its existing `display: none` below 1024px is left as-is — pre-existing behavior for Tags/Speakers today too, and not something this ADR needs to fix on its own (see Open questions).
- **Footer** (`Footer.astro`, currently just an About link and social icons, and not viewport-gated) gains a "browse" row linking Topics / Series / Tools / Speakers. This is what actually closes the sidebar's mobile gap: the footer stays reachable at every width, including the 768–1024px range where the sidebar has already disappeared but the header hasn't collapsed into its hamburger fallback. Without this, `Tools` specifically would have no nav entry point at all below 1024px, since — unlike Tags/Speakers — it isn't proposed for the header either.
- **Homepage** "Popular" cards become three honestly-labeled facets: Popular topics, Popular series (replacing the current mislabeled "Popular events"), and Popular tools.
- **Content card / detail page meta row** (`MetaItem.astro`) splits from one comma-separated tags line into three labeled groups — Series, Topics, Tools, each with its own icon — rather than growing a single flat list to four facets' worth of values.

## Consequences

New surface area: two new index pages (`/series/`, `/tools/`), a `Sidebar.astro` update (rename Tags to Topics, add a Tools section), a new footer browse row, a homepage card relabel plus a new "Popular tools" card, and a `MetaItem.astro` change from one flat tags line to three labeled facet groups.

None of this touches the sidebar's existing 1024px breakpoint — that gap is inherited, not created, and is left as an open question below rather than folded into this ADR's scope.

## Open questions

- Whether the sidebar's 1024px cutoff should eventually get a real mobile equivalent (e.g. a collapsible drawer) rather than relying on the footer's browse row as a link-only fallback. The footer fix guarantees every facet is reachable at every width; it doesn't give mobile/tablet visitors the same at-a-glance browsing the sidebar gives desktop ones. Out of scope here since it's a pre-existing gap affecting Tags/Speakers today, not something this ADR causes.
- Whether `Tools` should eventually move into primary header nav if usage data shows it's a heavily browsed facet rather than a cross-reference one.
- Exact visual treatment of the `/topics/` usage-weighted view (tag-cloud style vs. tiered sections vs. sortable grid) — a design pass, not an architecture decision.
