# ADR 0015: Rename video-aggregator to content-aggregator, split scripts by domain

## Status

Accepted

## Context

`video-aggregator/` has aggregated podcast content (via Podcast Index - `podcast.ts`, `getPodcasts.ts`) alongside video content (YouTube/Vimeo - `youtube.ts`, `vimeo.ts`, `getVideos.ts`) since podcast support was added; the directory name never caught up. A podcast is not a video, so the name actively misleads anyone navigating the repo by directory name alone. Separately, `scripts/` held all seven files flat - video, podcast, and shared helpers side by side - with no structural signal for which files belong to which domain.

## Decision

**Renamed `video-aggregator/` to `content-aggregator/`.** Chosen over the alternative of leaving the name and only documenting the scope in a README: the name is actively wrong, not just incomplete, and the blast radius of the rename was small and entirely mechanical (path strings, no logic changes).

**Split `scripts/` into three subfolders by domain, not by content type.** Considered and rejected two fully-separate top-level directories (`video-aggregator/` + `podcast-aggregator/`): `shared.ts`, `types.ts`, and `getImages.ts` are genuinely shared across both domains - `getImages.ts` in particular processes video/podcast/show content in one coordinated pass (shows before episodes, one shared folder-walk), not three independent jobs. A full split would either duplicate that shared layer (reversing the Phase 1 dedup work from ADR 0003/0004) or still require a third `shared/` directory, at which point it's the same three-way split proposed here with more top-level noise. Landed on:

- `scripts/video/` - `getVideos.ts`, `vimeo.ts`, `youtube.ts`
- `scripts/podcast/` - `getPodcasts.ts`, `podcast.ts`
- `scripts/shared/` - `shared.ts`, `types.ts`, `getImages.ts` (image fetching is shared across all three content kinds, so it lives with the other shared code rather than under `video/`)

**`data/` was left flat, not restructured to match.** Out of scope for this pass - the data files (`sources.json`, `podcast-sources.json`, `ignore.json`, etc.) aren't duplicated or misplaced the way the scripts were, and splitting them wasn't part of what was agreed.

**Every path reference was updated in the same pass**, not left as a follow-up: `package.json`'s `videos`/`podcasts`/`images` scripts and the `test:unit` file list, the three GitHub Actions workflows that read/write `video-aggregator/data/*` (`addPodcasts.yml`, `manual.yml`, `schedule.yml`), `src/pages/private/reference.json.js`'s import of `ignoreID.json`, the five renamed unit test files (`video-aggregator-*.test.mjs` → `content-aggregator-*.test.mjs`) and their imports, the README's directory tree and prose, and two explanatory code comments (`findFirstExistingImage.ts`, `formatDuration.test.ts`) that named the old path. Every internal `require()`/`import type` path within the moved scripts was updated for its new depth (e.g. `getPodcasts.ts` moved one level deeper, so `../data/...` became `../../data/...`, and `../../.env` became `../../../.env`).

**Past ADRs (0003, 0005, 0006) were left untouched.** They're a historical record of decisions made when the directory was still named `video-aggregator/` - rewriting them to say `content-aggregator` would misrepresent what the codebase actually looked like at the time those decisions were made.

## Consequences

- Directory structure now matches what the code actually does: a podcast script living under `scripts/podcast/` no longer sits in a folder called `video-aggregator/`.
- Verified behavior-preserving the same way prior phases were: full `test:unit` run and `tsc --noEmit` after the move (see verification note below), plus a repo-wide grep confirming no remaining non-historical reference to the old path.
- Any local `.env` file, uncommitted branch, or external tooling that hardcodes `video-aggregator/...` paths will need updating - this wasn't caught by the repo-wide grep since it only covers tracked files.
