# ADR 0004: Unify duration parsing and formatting

## Status

Accepted

## Context

Duration handling was split across three independent implementations that never referenced each other:

- `youtube.js` had two separate ISO 8601 parsers for the same input shape: `calculateTotalSeconds` (ISO 8601 string → total seconds, used for the shorts filter) and a second, differently-written regex parse buried inside `formatDuration` (ISO 8601 string → `H:MM:SS` display string). Neither called the other.
- `podcast.js` had its own `formatDuration` (raw seconds → `H:MM:SS`), operating on a completely different input shape (Podcast Index's API already returns seconds, not ISO 8601).
- The site's own `src/utils/formatDuration.ts` (stored `H:MM:SS` string → human-readable like `"5m 30s"`) and `src/utils/convertToISO8601Duration.ts` are a fourth and fifth piece of duration logic, unrelated to the ingestion-side parsers above.

The stored data model was already inconsistent between collections: every podcast episode (`src/content/podcast/`, 503 files) stores both a display string (`duration`) and canonical raw seconds (`durationSeconds`) - a previous, unrelated effort already did this correctly for podcasts. Every video (`src/content/media/`, 828 files) stores only the display string; there was no `durationSeconds` field in the media schema at all.

## Decision

We're bringing videos to parity with podcasts on new ingestion, without touching the two other pieces the initial audit flagged (the site's own `src/utils/formatDuration.ts`/`convertToISO8601Duration.ts`, and the 828 already-ingested video files). Scoped this way deliberately - see Consequences.

**Canonical representation:** total seconds (a number), matching what podcasts already do. `shared.js` gains two functions:

- `parseISO8601DurationToSeconds(rawDuration)` - the single ISO 8601 → seconds parser, replacing youtube.js's two independent copies.
- `formatSecondsAsDuration(totalSeconds)` - the single seconds → `H:MM:SS` formatter, replacing youtube.js's ISO-8601-parsing `formatDuration` and podcast.js's raw-seconds `formatDuration`.

`youtube.js`'s `calculateTotalSeconds`/`formatDuration` and `podcast.js`'s `formatDuration` are kept as thin wrappers under their original exported names, delegating to the shared functions. Nothing that imports them had to change.

**Schema:** `durationSeconds: z.number().nullable().optional()` added to the media collection in `src/content/config.ts`, matching the existing pattern on fields like `season`/`episode`/`itunesId` in the podcast collection that can be genuinely absent. `youtube.js`'s video-fetching functions now compute and expose `durationSeconds` alongside `duration` (via a new `applyDuration` helper that also de-duplicates the identical duration-computation block that was copy-pasted between `getAllVideosFromChannel` and `getAllVideosFromPlaylist`). `getVideos.js`'s `generateMdxFile` writes it to frontmatter for newly-generated videos.

**One behavior change, made deliberately while unifying:** youtube.js's old `formatDuration` special-cased day-only ISO 8601 durations (`"P2D"`) to a hardcoded `"24:00:00"` placeholder regardless of the actual day count, while `calculateTotalSeconds` computed the *real* seconds for the same input (`172800`, i.e. 48 hours) - these two functions already disagreed with each other before this change. Now that both paths go through one parser, day-only durations format as their real duration (`"P2D"` → `"48:00:00"`). We chose the real value over preserving the placeholder: it's more correct, and the placeholder's rationale ("Placeholder for very long content") doesn't hold up now that computing the real value is free.

**A defensive fix found along the way:** `gray-matter`'s YAML serializer throws on `undefined` values (unlike `JSON.stringify`, which silently drops them). `video.durationSeconds` is legitimately `undefined` for Vimeo videos (the Vimeo integration never computes a duration at all) and would have crashed `generateMdxFile`. Fixed with `video.durationSeconds ?? null` at the frontmatter-building call site - `null` serializes cleanly and matches the schema's `.nullable()`.

## Consequences

Scope was deliberately kept to ingestion only, decided with Frank before starting given the size of the alternative:

- **Not touching the 828 existing video files.** They keep their `duration` string with no `durationSeconds`, exactly as before. `durationSeconds` is optional in the schema, so this is not a breaking gap - it only affects videos ingested from this point forward. A future migration could backfill it deterministically (parsing each existing `duration` string is lossless), but that's a content-data change affecting hundreds of real files and deserves its own explicit go-ahead, not a side effect of a code-refactor phase.
- **Not touching `src/utils/formatDuration.ts`/`convertToISO8601Duration.ts` or the 12 site-rendering files that consume `duration`.** These solve a different problem (stored value → human-readable render string) than the ingestion-side parsers unified here (raw API response → stored value), and reworking them to consume `durationSeconds` directly would mean handling two duration shapes on existing content anyway, for no immediate benefit. Worth a dedicated pass later if the site wants to render from `durationSeconds` when present.
- Every real input we could enumerate produces identical output to the pre-unification code, verified by running old and new implementations side by side before rewiring any call site - except the one documented `P{n}D` case above.
