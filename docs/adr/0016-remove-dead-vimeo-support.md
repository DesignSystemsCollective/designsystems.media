# ADR 0016: Remove dead Vimeo support instead of fixing it

## Status

Accepted

## Context

`sources.json` had a live entry ("DS Video Aggregator", type `"vimeo-channel"`) that was silently dropped on every single ingestion run: `getVideos.ts`'s handler map only recognized the key `"vimeo"`, not `"vimeo-channel"`, and even if that had matched, the handler called `getAllVideosFromVimeo()` - a function `vimeo.ts` never actually exported (it only exported `getVideoDataFromVimeo(videoId)`, a single-video lookup with an unrelated signature). ADR 0006 (the TypeScript conversion) surfaced and documented this gap but deliberately preserved it rather than fixing it, at Frank's request, pending a decision on which way to resolve it.

## Decision

**Removed the dead code and the source entry, rather than building real Vimeo channel-listing support.** Two options were considered:

1. Implement `getAllVideosFromVimeo(channelUri, importedData)` for real - paginated channel video listing, matching the `Video` shape `youtube.ts` produces (including fields Vimeo's current single-video lookup never populated: `durationSeconds`, `privacyStatus`). This is real feature work, not a bug fix - it needs a Vimeo API access token to build and verify against the actual channel, and a decision on how to map Vimeo's channel/showcase URL formats to a fetchable ID.
2. Remove `vimeo.ts`, the `"vimeo"` handler entry, the Vimeo-shaped type accommodations, and the `vimeo-channel` source entry entirely.

Went with (2), at Frank's explicit choice. The channel's videos won't be aggregated going forward; if Vimeo support is wanted later, it should be scoped as new feature work, not revived from this dead code.

## Changes

- Deleted `content-aggregator/scripts/video/vimeo.ts`.
- Removed the `"vimeo"` entry from `getVideos.ts`'s `videoHandlers` map and its `getAllVideosFromVimeo` import.
- Removed the `vimeo-channel` entry from `content-aggregator/data/sources.json`.
- Tightened `types.ts`'s `Source.type` from a loose `string` to the literal union `"youtube-channel" | "youtube-playlist"` - the looser type existed specifically to accommodate the `vimeo-channel`/`vimeo` mismatch (see ADR 0006); with that gap gone, every configured source matches a registered handler, so the literal union is now accurate rather than hiding a known gap.
- Updated comments and tests that referenced Vimeo as a live or documented-broken case (`content-aggregator-video-orchestration.test.mjs`'s handler test, `content-aggregator-frontmatter.test.mjs`'s durationSeconds-absent test) to reflect that the general case (any source not returning a duration) still applies even though Vimeo specifically is gone.
- `videoHandlers[source.type]` in `getVideos.ts`'s `main()` still falls back to a runtime `console.warn` for an unrecognized type, even though the type no longer statically allows constructing one - kept as defense against `sources.json` drifting out of sync with the handler map again, the same failure mode that caused this whole situation.

## Consequences

- The Vimeo channel previously configured ("DS Video Aggregator") will no longer be aggregated at all - it was already producing zero videos in practice (every run silently skipped it), so this is a documentation of reality rather than a regression.
- Verified via `test:unit` (all passing) and `tsc --noEmit` (no new errors) after the removal.
