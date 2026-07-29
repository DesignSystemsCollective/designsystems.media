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
- **Sidebar is not used.** `Sidebar.astro` was updated (Topics renamed from Tags, Tools section added) and trialed by wiring `sidebar={true}` onto the video and podcast/show detail pages to see it live. Two problems surfaced: it broke visually on podcast/show pages (`Hero.astro`'s full-bleed background has an explicit `z-index`, `Sidebar.astro`'s `<aside>` has none, so the hero painted over the sidebar and made it uninteractive — it worked cleanly on video pages, which use a different hero component), and independent of that bug, it just wasn't wanted as a UI pattern once seen running. Reverted back to `sidebar={false}` everywhere, which was already the state on every page before this ADR (see Consequences) — `Sidebar.astro`'s content update stays in the codebase as unused code, same as it was pre-ADR-0013.
- **Footer** (`Footer.astro`, currently just an About link and social icons, and not viewport-gated) gains a "browse" row linking Topics / Series / Tools / Speakers. This is what actually closes the sidebar's mobile gap: the footer stays reachable at every width, including the 768–1024px range where the sidebar has already disappeared but the header hasn't collapsed into its hamburger fallback. Without this, `Tools` specifically would have no nav entry point at all below 1024px, since — unlike Tags/Speakers — it isn't proposed for the header either.
- **Homepage** "Popular" cards become three honestly-labeled facets: Popular topics, Popular series (replacing the current mislabeled "Popular events"), and Popular tools.
- **Content card / detail page meta row** (`MetaItem.astro`) splits from one comma-separated tags line into three labeled groups — Series, Topics, Tools, each with its own icon — rather than growing a single flat list to four facets' worth of values.

## Consequences

New surface area: two new index pages (`/series/`, `/tools/`), a new footer browse row, a homepage card relabel plus a new "Popular tools" card, and a `MetaItem.astro` change from one flat tags line to three labeled facet groups.

`Sidebar.astro` was updated and trial-wired onto detail pages, then reverted — every page still passes `sidebar={false}`, same as before this ADR. This means the sidebar's pre-existing 1024px cutoff (hidden below that width, no mobile equivalent) is moot: the component isn't shown at any width. The footer browse row is therefore not "the mobile fallback for the sidebar" as originally framed — it's the only persistent global browse surface this ADR ships, at every viewport.

## Open questions

- Whether `Tools` should eventually move into primary header nav if usage data shows it's a heavily browsed facet rather than a cross-reference one.
- Whether `Sidebar.astro` is worth fixing and re-trying later (with the `Hero.astro` z-index conflict actually resolved) or should be considered dead code and removed outright.
- Exact visual treatment of the `/topics/` usage-weighted view (tag-cloud style vs. tiered sections vs. sortable grid) — a design pass, not an architecture decision.
