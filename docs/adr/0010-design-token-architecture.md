# ADR 0010: Design token architecture (spacing, typography, radius, shadow)

## Status

Accepted

## Context

The 2026-07-08 audit found a partial token layer, not a blank slate: `core.css` (raw color primitives) and `semantic.css` (color aliases) plus `themes/{light,dark}.css` already gave color a clean 3-tier shape. Everything else was ungoverned - 161 hardcoded `font-size`/`border-radius`/`padding`/`margin`/`gap` literals across 23 files, no spacing scale, no typography scale, no radius/shadow scale anywhere, not even `global.css`'s own heading scale and body font size.

Decided 2026-07-08, before this phase started: bespoke to this repo, not sourced from `lagom-tokens` (Frank's cross-project design-token package) - no cross-repo build dependency, stays scoped to this site's actual design system. Worth revisiting later if a shared token source across projects becomes worth the coupling, but that's a separate decision from this refactor.

This phase's own rule, per the refactor plan: every new token's value matches a value already in use today. This introduces the scale; it doesn't change what anything looks like, and nothing consumes the new tokens until Phase 11 (`global.css`) and Phase 12 (all other components).

## Decision

**New primitives added to `core.css`, not new files.** Color primitives already live there; spacing/typography/radius/shadow join them as new sections in the same file rather than a `spacing.css`/`typography.css` split. `semantic.css` already wasn't purely color either (`--header-height`, `--pagefind-ui-border-radius` predate this phase) - `core.css` as "the primitives file" fits the existing pattern better than inventing a per-category file structure.

**No semantic or theme layer for these four categories - primitives only.** Color needs three tiers because the same semantic role (`--tagCount-text`) resolves to a different literal per theme. Spacing, font-size, radius, and (mostly) shadow don't vary by light/dark theme, so a semantic aliasing layer would just be a second name for the same value - added indirection with no payoff. The one shadow token that *is* theme-aware (`--shadow-md`, built on the existing `--shadow` RGB-triplet theme variable) already gets that through composition, not a new layer.

**Spacing scale (`--space-N`, N = px at the default 16px root, expressed in rem):** 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Every step matches a literal already found in the audit's `padding`/`margin`/`gap` grep. Px-to-rem at a 16px root is exact for all of these (8px = 0.5rem, 12px = 0.75rem, etc.) - no rounding introduced.

**UI font-size scale (`--font-size-N`, same px-at-16px-root-in-rem convention):** 12, 13, 14, 15, 16, 17, 18, 20. Covers the plain body/meta/badge text sizes.

**Heading scale kept separate and kept as `em`, not converted to `rem`.** `global.css`'s `h1`-`h5` are a deliberate, hand-tuned scale, not five arbitrary numbers - `h4`'s `1.563em` and `h3`'s `1.953em` are literally `1.25²` and `1.25³`, a modular scale the original CSS was following (even though `h1`/`h2` break from the pattern, and `h3` renders larger than `h2` as a result - a pre-existing quirk, preserved as-is per this refactor's behavior-preservation rule, not "fixed" as a drive-by). Converting these to root-relative `rem` would have meant computing each one's effective px against `body`'s own font-size (20px desktop, 18px at ≤768px) and re-deriving a new absolute number - extra arithmetic that only introduces rounding risk for zero benefit, since the whole point of `em` here was to stay relative to `body`. Tokenized as literal `em` values instead: `--font-size-h1` through `--font-size-h5`, plus `--font-size-h1-tablet`/`-h2-tablet`/`-h3-tablet` for the existing ≤1024px media-query overrides (`h4`/`h5` have no tablet override today, so no token was invented for one).

**Font-weight and line-height, direct value matches.** `--font-weight-regular`/`-medium`/`-semibold`/`-bold` (400/500/600/700). Line-height didn't cluster into clean "tight/normal/loose" names - the actual values in use (1, 1.1, 1.2, 1.3, 1.35, 1.4, 1.5, 1.7) don't group that way - so `--leading-N` is named by value × 100 (`--leading-170` = `1.7`) rather than forcing a semantic label that wouldn't be accurate.

**Border-radius scale, same px-in-rem convention as spacing:** 0 (`--radius-none`), 2, 4, 6, 8, 12, 16, plus `--radius-full` (9999px, pill/circle). One observed `1px` radius (a single occurrence) was deliberately left out - not worth a scale step for one use; Phase 12 decides locally whether it rounds to `--radius-2` or stays a documented exception.

**Shadow: three elevation steps, matched to the codebase's dominant literal per "weight," not redesigned.** `--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1)`, `--shadow-md: 0 2px 8px rgb(var(--shadow) / 8%)`, `--shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.3)` (the last one is the dominant literal, appearing three times in the audit). These are plain drop-shadows only - `MediaCard`'s hover-glow effect (`box-shadow`/`outline` built from `--accent-glow`/`--accent-hover`) is a different, already-tokenized visual language and wasn't folded in here.

**Explicitly left un-tokenized, by design, not oversight:** `em`-based spacing inside small self-contained components (badge/code/meta padding like `0.1em`, `0.35em`, `0.6em`) that intentionally scales with its own element's font-size rather than the page's layout grid. Tokenizing these into the flat `rem` spacing scale would change what they mean (root-relative vs. self-relative) even if the numbers matched today. Left as a per-usage judgment call for whoever does that specific component in Phase 12, same treatment as the one dropped `1px` radius.

## Consequences

- Zero visual risk from this phase by construction: only new, unreferenced CSS custom properties were added to `core.css`. No component, layout, or existing token was touched. Verified via a full production build (2559 pages, zero errors, unchanged from pre-phase) and confirming the new custom properties (`--space-64`, `--font-size-h3`, etc.) compile through into the built CSS bundle as expected.
- `test:visual` should show zero diffs across all ten routes when run locally, per the plan - this is a pure control check for this phase specifically, since nothing consumes the new tokens yet.
- Phase 11 (`global.css`) and Phase 12 (all other components) inherit a few open questions this phase deliberately punted rather than guessed at: whether the `1px` radius and the `em`-based contextual spacing round onto the new scale or stay local exceptions, and whether `--shadow-lg`'s hardcoded `rgba(0, 0, 0, 0.3)` should eventually move to the theme-aware `--shadow` variable it currently ignores (kept as an exact literal match here, per this phase's own rule, rather than "improved" as an unplanned scope increase).
- The heading `em` tokens mean Phase 11's `h1`-`h5` substitution is a literal drop-in (`font-size: 2.2em` → `font-size: var(--font-size-h1)`), not a recomputation - lowest possible risk for the highest-leverage file in the migration.
