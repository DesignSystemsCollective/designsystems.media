# ADR 0003: Centralize content-file writing via a shared `writeContentFile` helper

## Status

Accepted

## Context

`getVideos.js`, and `getPodcasts.js`'s show and episode generators, each built `.mdx` frontmatter by hand with template literals: `title: "${video.title}"`, `speakers: [${show.speakers}]`, and so on. None of them escaped embedded quotes consistently. `getPodcasts.js`'s show generator escaped `description` (`.replace(/"/g, '\\"')`) but not `title`; `getVideos.js` and the episode generator escaped neither field. A title containing a `"` - a real, unremarkable occurrence in podcast/video titles - produced a YAML value with an unescaped embedded quote, which is invalid YAML. The generated `.mdx` file would silently fail to parse (or parse with truncated/garbled frontmatter) the next time the site's content collections loaded it.

Phase 0 of this refactor added tests that pinned this exact failure mode (`src/tests/unit/video-aggregator-frontmatter.test.mjs`) so it could be fixed with a clear before/after.

The obvious narrow fix - add `.replace(/"/g, '\\"')` everywhere a string gets interpolated into one of these templates - only patches the specific bug we've already found. It doesn't handle the other characters that are meaningful to YAML (`:`, `#`, leading `-`, etc.), doesn't help the next field someone adds, and leaves three separate places that all need to independently get quoting right forever.

## Decision

We introduced `writeContentFile(frontmatter, body)` in `video-aggregator/scripts/shared.js`, built on `gray-matter`'s `stringify` (already a project dependency - previously only used for reading, in `getImages.js`). It takes a plain JS object plus a body string and returns the full `.mdx` file contents:

```js
function writeContentFile(frontmatter, body = "") {
  return matter.stringify(body, frontmatter);
}
```

`getVideos.js`'s `generateMdxFile`, and `getPodcasts.js`'s `generateShowMdx`/`generateEpisodeMdx`, now build a plain frontmatter object with real JS values (strings, numbers, booleans, `null`, arrays) instead of a template-literal string, and pass it through `writeContentFile`. Quoting and escaping is delegated entirely to a real YAML serializer instead of ad hoc string interpolation, which fixes the whole bug class - not just the title field - in one place.

A few call sites needed small, deliberate translations to preserve existing behavior rather than a literal one-to-one copy of the old template:

- `show.speakers` (a plain string like `"Amy Hupe and Geri Reid"`) was previously spliced raw into `[${show.speakers}]`, which happened to produce a single-item YAML flow sequence for the actual data in production (verified against `video-aggregator/data/podcast/shows.json` - no speaker string in current data contains a comma). It's now written as an explicit single-element array, `[show.speakers]`, which parses to the identical result for all real data without depending on the coincidence that YAML flow-sequence syntax and comma-free strings happen to look the same.
- The `"Uncategorized"` fallback for empty `categories`/`speakers` arrays (previously inside `utils.formatYamlArray`) is preserved as an explicit `items.length > 0 ? items : ["Uncategorized"]` check at each call site.
- `season`/`episode`/`image` used `value || 'null'` (a string) to fall back to a bare YAML `null`; these are now `value || null` (the real value), which `gray-matter` serializes as YAML `null` directly and is behaviorally identical for every falsy input the old code handled (including the `0`-is-treated-as-absent quirk, which we chose to preserve rather than silently fix here - Phase 2 is about frontmatter serialization, not this field's business logic).

This only affects newly-generated files going forward. `generateMdxFile`/`generateShowMdx`/`generateEpisodeMdx` all skip writing if the target file already exists, so no existing `.mdx` file under `src/content/` is rewritten or reformatted by this change.

## Consequences

Any title, description, or other free-text field can now contain quotes, colons, or other YAML-meaningful characters without producing invalid frontmatter - verified directly by round-tripping each of the three generators' output back through `gray-matter`'s parser in tests, rather than asserting on exact YAML text.

The on-disk formatting of newly-generated frontmatter changes cosmetically: arrays are emitted as YAML block lists (`tags:\n  - Unsorted`) instead of inline JSON-style arrays (`tags: ["Unsorted"]`), and strings that don't need quoting are left unquoted. Both are standard YAML and parse identically through `gray-matter`/Astro's content collections; this is a formatting difference, not a data difference.

Future fields added to any of these three generators get correct escaping automatically, as long as they're added to the frontmatter object rather than back into a template literal. There's no lint rule enforcing this - it relies on the convention holding, same as ADR 0001's content-domain boundary does.
