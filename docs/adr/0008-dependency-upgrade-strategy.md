# ADR 0008: Dependency upgrade strategy

## Status

Accepted

## Context

Going into Phase 9, `astro`, `@astrojs/mdx`, `@astrojs/netlify`, `@astrojs/react`, `astro-pagefind`, `dotenv`, `googleapis`, `sharp`, and `typescript` were all a major version or more behind - `astro` alone was two majors back (5→7). The obvious shortcut is one bulk `npm install ...@latest` pass across all of them and see what breaks. This ADR is about why that shortcut was rejected in favor of doing it one package (or one tightly-coupled group) at a time, each with its own commit and its own full `test:unit`/`test:smoke`/`test:visual` run before moving to the next.

## Decision

**One package or tightly-coupled group per commit, not a bulk pass.** `googleapis` (148→173) and `typescript` (bumped ahead of Phase 4, since the new TS conversion needed the newer compiler in place, not the other way round) were each their own isolated change. `astro` itself was split into two separate hops - 5→6, then 6→7 - rather than jumping straight to 7, specifically because each major version carries its own large, unrelated breaking-change surface (5→6: the Content Layer API replacing implicit collection auto-scanning, `.slug`→`.id` renames, `.render()` removal; 6→7: the Rust compiler becoming the only compiler, `compressHTML`'s default changing, the Sätteri markdown pipeline). Bumping both in one step would have meant untangling failures from two unrelated breaking-change sets simultaneously with no way to tell which hop caused which failure.

**`@astrojs/mdx`, `@astrojs/netlify`, `@astrojs/react`, and `astro-pagefind` moved in lockstep with each `astro` hop, not independently.** This wasn't a stylistic choice - `@astrojs/mdx`/`@astrojs/netlify`/`@astrojs/react` each declare a hard `astro` peer range in their `package.json` (e.g. `@astrojs/netlify@8.1.1` requires `astro: ^7.0.0`), so bumping `astro` alone would have left them on an unsatisfiable peer version. `astro-pagefind` was a looser case worth recording on its own: `1.8.3`'s peer range only covered `astro ^2` through `^5` - it had already been running against `astro` 6 on a loose peer-warning basis with no real compatibility guarantee, and would very likely have broken outright on 7 (confirmed separately: `2.0.1`'s peer range explicitly extends to `^7`). Checking each dependency's actual peer range before assuming "it'll probably keep working" caught this before it became a build failure.

**`dotenv` and `sharp` stayed genuinely independent**, bumped in their own commit at the end of Phase 9, since neither has any peer-dependency relationship to `astro`'s version.

## Consequences

**The one-at-a-time discipline paid for itself concretely - each hop surfaced real, distinct bugs that a bulk update would have piled on top of each other:**

- **astro 5→6:** `src/content.config.ts`'s four collections silently resolved empty (Astro 6 removed the implicit "no loader = auto-scan" fallback) - breaking nearly every dynamic route and the homepage, but *not* the build itself, so it initially looked like a clean migration until a real `test:smoke`/`test:visual` run caught it. Separately, `@astrojs/netlify`'s default `imageCDN` routing broke every image in local build/preview (only resolves on Netlify's actual edge). A third, unrelated pre-existing dead link (`/tags/get-started/`) surfaced in the same smoke run and was fixed alongside it, since it was already being looked at.
- **astro 6→7:** the newly-default, stricter Rust compiler caught a genuinely broken script in `LibraryStats.astro` (`${videoCount}` template-literal syntax used outside an actual template literal, inside a `define:vars` block where `videoCount` was already a bare in-scope identifier) - this had been silently throwing in the browser console on every page load for who knows how long, since the old Go-based compiler passed broken `<script>` content through untouched. `astro-pagefind` 2.0 also dropped a `.ts` re-export shim, breaking the `Search` component import outright. Both were build-time failures, not comparison drift - unrelated to the two accepted, cosmetic-only visual-baseline updates (a shrunk "Popular topics" list from an intentional dead-link removal, and pagefind's new `⌘K` shortcut badge cascading a few px through every page).

Had `astro` gone 5→7 in one hop, all four of these (two build-breaking, two behind-the-scenes-until-a-real-test-run) would have surfaced at once, with no way to tell from the error output alone which of two unrelated major-version migrations was responsible.

**`sharp`'s `package.json` `"overrides"` pin is a byproduct worth recording.** During the 5→6 hop, `@astrojs/netlify` (then `7.0.13`) pulled in `ipx`, which nested its own `sharp@0.34.5` - a version with a documented macOS ARM64 build-from-source bug. Pinning `overrides.sharp` to the already-working `0.34.2` fixed it. By the time `sharp` itself was bumped to `0.35.3` at the end of Phase 9, `@astrojs/netlify` `8.1.1` no longer listed `ipx` as a direct dependency at all - the override may no longer be strictly necessary. It was kept (updated to `0.35.3` to match) rather than removed, since some other transitive dependency could still nest a mismatched copy, and there's no cost to keeping the whole tree on one consistent version. Worth revisiting if a future `sharp` bump turns up evidence the override is genuinely dead weight.

**Every hop left a rollback point.** Each commit in this phase (`googleapis`, `typescript`, `astro` 5→6 plus its bugfixes, `astro` 6→7 plus its bugfixes, `dotenv`+`sharp`) is independently revertable without unwinding unrelated changes - a deliberate consequence of not batching, not just a side effect.
