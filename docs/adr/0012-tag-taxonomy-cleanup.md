# ADR 0012: Split `tags` into `series` / `topics` / `tools`, retire `categories`

## Status

Proposed — not yet implemented. This is a taxonomy for review before any schema or content changes are made.

## Context

`tags` on `media` and `podcast` entries is a single freeform field (Front Matter CMS `type: "tags"`, no fixed option list), unlike `speakers`, which is a real controlled taxonomy defined in `frontmatter.json`. The difference shows in the data:

- 828 media entries carry **521 unique tags**; 503 podcast entries carry **114 unique tags**. Combined: **564 unique tags across 1,978 total tag applications**.
- Of those 564, **337 are used exactly once and 76 are used exactly twice** — 413 tags (73% of all unique tags) account for only 489 of the 1,978 applications (25%). The other 151 tags (those used 3+ times) carry the remaining 75%.
- **429 of 503 podcast episodes (85%) have no tags at all.** The sprawl problem on podcasts is actually the opposite of media: total absence rather than proliferation.
- A leftover `"Unsorted"` placeholder (the aggregator's default value for new imports) is still attached to 20 published videos.
- `categories` is present on every entry but carries zero information: every media entry is `Video`, every podcast is `Podcast` — one value each, already implied by which collection the entry lives in.
- `/tags/` is a live, public, alphabetically-indexed page (`src/pages/tags/index.astro`), and each tag gets its own page (`src/pages/tags/[...slug].astro`). With 413 near-singleton tags, that's several hundred public pages with one item on them — thin content for SEO and a poor browse experience for visitors.

The root cause: `tags` is doing at least three unrelated jobs at once — naming the recurring show/conference an entry came from, naming a tool or vendor mentioned in it, and naming the actual subject matter — with no fixed vocabulary stopping a new one-off tag from being minted per entry. `speakers` doesn't have this problem specifically because it's a closed list.

## Decision (proposed)

Split the single `tags` field into three purpose-built facets, and make each one a controlled taxonomy the same way `speakers` already is.

### 1. `series` — the recurring show or conference an entry belongs to

Closed list, added as `customTaxonomy` in `frontmatter.json` alongside `speakers`. Candidates, drawn from tags currently used 3+ times that are actually proper-noun show/event names rather than topics:

| Series | Current tag applications |
|---|---|
| Design Systems London | 62 |
| Converge | 28 |
| Design Systems WTF | 28 |
| Coding Design Systems | 23 |
| Into Design Systems | 20 |
| Design System Social Club | 15 |
| Beyond The Button | 13 |
| The Future Of Design Systems | 12 |
| Design Systems Field Guide | 10 |
| UnConference | 7 |
| DSW Day | 7 |
| The Product Shipping Forecast | 6 |
| Design Systems Rodeo | 5 |
| Axe-Con | 5 |
| DesignOps Island Discs | 5 |

That's 15 series covering 246 tag applications, pulled entirely out of the topic/tag space where they were diluting the browse experience.

### 2. `topics` — actual subject matter (renamed, trimmed `tags`)

Closed list, same `customTaxonomy` treatment. Starting point: cluster the tags used 3+ times, merging obvious case/plural/synonym variants. Examples of merges:

- `Design Tokens` + `Design tokens` + `Design token` → **Design Tokens**
- `Scale` + `Scaling` + `Scalability` → **Scale**
- `Workflow` + `Workflows` → **Workflow**
- `DesignOps` + `Design Ops` → **DesignOps**
- `Failure` + `Fail` + `Fails` → **Failure & Lessons Learned**
- `Maturity` + `Maturity Model` → **Maturity**
- `Versioning` + `Semantic Versioning` → **Versioning**
- `Components` + `Component Library` → **Component Libraries**
- `Change` + `Change Management` → **Change Management**
- `Get Started` + `Get started` + `Starting` → drop as topic, move to format (see below)
- `Design Systems` (used 3 times) → drop entirely, meaningless on a design-systems-only site

After merging, a starter topic list of roughly 40-50 terms, e.g.: Clarity, Design Tokens, Accessibility, Documentation, AI, Collaboration, Adoption, Governance, Atomic Design, Consistency, Contribution, Inclusivity, Automation, Best Practices, Career, Theming, Content, Component Libraries, Creativity, Flexibility, Measurement, Workflow, Culture, Color, Principles, Buy-In, Strategy, ROI, Patterns, Communication, Community, Process, Analytics, Burnout, Soft Skills, Typography, Management, Maintenance, Metrics, Cross-functional, Versioning, Impact, Leadership, Performance, Foundations, Scale, DesignOps, Maturity, Change Management, Naming Conventions, User Research, Quality, Advocacy, Diversity, Brand, Developer Experience.

This is a starting point, not a final list — worth an editorial pass to cut anything you wouldn't expect to reuse across at least 3-5 future entries.

### 3. `tools` — products, plugins, and libraries mentioned

Closed list. These recur enough to be genuinely useful for discovery ("show me everything that mentions Figma Variables") but are a different kind of fact than a topic:

Figma (46), Supernova (32), Zeroheight (29), Sketch (10), Figma Tokens (11), Tokens Studio (6), Specify (5), Figma Plugin (5), Figma Variables (5), Storybook (4), Backlight (3), Leonardo (3).

One-off company/case-study mentions (GOV.UK, Spotify, Airbnb, IKEA, Salesforce, Atlassian, NASA, Adobe, Uber, etc.) are recommended to **not** become tags — the list is open-ended, nearly every one is used once, and they're better served by full-text search over title/description than by a taxonomy entry.

### 4. Retire `categories`

Drop the field, or repurpose it for actual content format (Talk, Panel, Product Demo, Interview, Q&A, Deep Dive, AMA, Roundtable, Webinar) using tags that are currently miscategorized as topics — `Panel` (27), `Product Demo` (22), `Deep Dive` (12), `Q&A` (8), `AMA` (5), `Roundtable` (3), `Get Started` (25 combined) all describe format, not subject.

### 5. Enforce the closed vocabulary going forward

The actual lever that stops sprawl is the same one that already keeps `speakers` clean: define `topics`, `series`, and `tools` as `customTaxonomy` entries in `frontmatter.json` (like the existing `speakers` list) so Front Matter CMS presents a fixed picker instead of a free-text box. Update the Zod schema in `src/content.config.ts` to match. Any new value should require a deliberate addition to the taxonomy list, not just typing something new into a field.

### 6. Cleanup items

- Strip the `"Unsorted"` placeholder from the 20 media entries that still carry it.
- Backfill `topics` on the 429 untagged podcast episodes — likely the biggest single content gap.

Navigation and information-architecture changes that follow from this split (header nav, `/topics/`/`/series/`/`/tools/` index pages, sidebar, footer, homepage, content-card meta row) are covered separately in ADR 0013, which depends on this ADR's taxonomy being accepted first.

## Maintenance — keeping it clean after launch

Two separate mechanisms are needed: one that stops bad tags getting in, and one that actually assigns good tags without manual typing.

**Single source of truth for the taxonomy.** Define `TOPICS`, `SERIES`, and `TOOLS` once, as arrays in a TS file under `src/lib/content-domain/` (e.g. `taxonomy.ts`). `content.config.ts` imports it to build the Zod enum; a small sync script generates `frontmatter.json`'s `customTaxonomy` entries from the same source. If the CMS picker and the schema validator are ever defined in two places, they will drift, and the closed list becomes closed in name only.

**Enforcement — automatic, no discipline required.** Change the Zod schema from `z.array(z.string())` to `z.array(z.enum(TOPICS))` (and the same for `series`/`tools`). Astro validates every entry against this at build time, so any file with a value not on the list fails the build — regardless of whether that file came from the CMS, the aggregator scripts, or an LLM step. This slots into the same prebuild validation pass ADR 0001 already runs (missing assets, duplicate slugs, broken references); tag drift becomes one more check in that list. This is the layer that actually guarantees no sprawl, because it doesn't depend on anyone remembering a rule.

**Assignment — automate the tagging itself, not just the gate.** New content already passes through an AI pipeline before publishing (`fetch_description`, `fetch_subtitles`/`transcribe_audio`, `analyse_transcript` → `write_video_summary`). That step should select `topics`/`series`/`tools` from the closed lists based on the transcript and description, instead of a human free-typing them into the CMS. Constrained to a closed list, the model can't reintroduce sprawl — it can only choose from what already exists. This is also the fix for the 429 untagged podcasts: today's tagging step is evidently being skipped for that content type, and automating it closes the gap going forward instead of just once.

**When nothing fits.** If a piece of content genuinely doesn't match anything in the closed list, the pipeline should flag it for review (log the entry, don't invent a tag) rather than silently create one. Adding a new taxonomy term should be a deliberate, infrequent PR touching the taxonomy file — a case of "we've now seen this topic 3+ times and it deserves its own entry," not "this one video needed a word for itself."

**Backstop — semantic drift.** Build validation only catches *unknown* values; it won't catch someone adding a legitimate new taxonomy term that duplicates an existing one in meaning (a new `Component Systems` when `Component Libraries` already exists). That needs a periodic human review rather than a hard gate — a quarterly audit that reruns the same distribution analysis behind this ADR (usage counts per term, near-singleton terms, entries with too few or zero topics) and reports drift before it becomes another 564-tag pile.

## Consequences

Splitting the field means every media/podcast entry needs re-tagging against the new vocabulary — not a small migration (828 + 503 entries). `/tags/` should shrink from ~521 pages down to something like 40-50 meaningful ones, each with a real cluster of content behind it, which is a better outcome for both SEO and browsing. `series` becomes a new browsable facet that didn't functionally exist before (it was mixed into tags). Podcasts need a real tagging pass since most currently have nothing.

Navigation consequences (new pages, nav/sidebar/footer/homepage changes) are covered in ADR 0013.

## Open questions

- Final trim of the ~50-term starter topic list — which terms are worth keeping vs. folding into a broader neighbor.
- Whether `categories` gets repurposed for format or removed outright.
- Migration approach for the 1,331 existing entries (scripted remap vs. manual pass) — out of scope for this ADR, to be decided once the taxonomy itself is approved.
