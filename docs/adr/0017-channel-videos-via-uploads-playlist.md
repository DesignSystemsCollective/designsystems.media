# ADR 0017: Fetch channel videos via the uploads playlist, not search.list

## Status

Accepted

## Context

`getAllVideosFromChannel` enumerated a channel's videos with `youtube.search.list({ channelId, type: "video", order: "date" })`. This is YouTube Data API v3's general-purpose search endpoint, priced at **100 quota units per page** (up to 50 results) - by far the most expensive list operation the API offers. `playlistItems.list` and `videos.list`, by contrast, cost **1 quota unit per call** regardless of page size.

Two compounding problems, both already flagged in the code itself (a TODO comment referencing the exact fix below, and a second TODO asking whether the already-imported check could happen earlier):

1. **11 of 18 configured sources are `"youtube-channel"` type** - the majority of ingestion cost was going through the expensive endpoint.
2. **The loop pages through the entire channel history on every run**, skipping already-imported videos one at a time via `continue` rather than stopping early. A channel's quota cost was unbounded and grew every time it accumulated more uploads, even though a typical run only finds a handful of new videos.

A channel's videos can also be read from a completely different, much cheaper source: every YouTube channel has a hidden "uploads" playlist, automatically populated with every video it has ever publicly uploaded. `getAllVideosFromPlaylist` already reads arbitrary playlists this way for the 7 `"youtube-playlist"` sources, at 1 quota unit per page.

## Decision

**`getAllVideosFromChannel` now looks up the channel's uploads-playlist ID via `youtube.channels.list` (1 quota unit, one call) and delegates entirely to the existing `getAllVideosFromPlaylist`**, instead of maintaining an independent search-based implementation. Added `getUploadsPlaylistId(channelId)` for the lookup; `getAllVideosFromChannel` is now a thin wrapper.

**Not addressed in this change: bounding how much history is walked per run.** `playlistItems.list` has no server-side date filter (`search.list`'s `publishedAfter` param doesn't exist on it), so avoiding a full-history walk would require a client-side "stop once caught up" heuristic. That was considered and deliberately deferred: a naive "stop on the first already-imported video" is unsafe, because Shorts are filtered out and never recorded in `output.json` as imported, so they'd never trigger a stop condition and could appear interleaved with genuinely already-known videos further back in the playlist. With this change alone, the cost of walking full history dropped ~100x (100 units/page to 1 unit/page), so the marginal value of a stop-early heuristic no longer outweighs the risk of silently missing a video. If a specific channel's back-catalog grows large enough that this residual cost matters, a conservative threshold-based version (stop only after N consecutive known videos, not the first one) should be scoped and tested as its own change.

**No changes needed to `sources.json`.** `type: "youtube-channel"` and the channel URL format are unchanged - `videoHandlers["youtube-channel"]` still routes here, and the existing `source.url.split("/").pop()` channel-ID extraction still feeds directly into `getUploadsPlaylistId`.

## Consequences

- Quota cost for channel sources drops roughly 100x per page (100 units to 1 unit), and the one-time uploads-playlist lookup adds 1 unit per channel per run.
- Same video set, same fields, same filtering rules (Shorts, already-imported, description/duration/privacyStatus) - `getAllVideosFromChannel` now runs through the exact same code `getAllVideosFromPlaylist` already used and already had test coverage for, rather than a parallel implementation.
- Side benefit: `search.list` is index-based and has a known propagation lag after a new upload; the uploads playlist reflects a new upload immediately, so this is a reliability improvement as well as a cost one.
- `content-aggregator-youtube-api.test.mjs`'s channel tests were rewritten to mock `channels.list` + `playlistItems.list`/`videos.list` instead of `search.list`, and now assert on the delegation (uploads playlist found -> passed to the playlist path; not found -> `[]` without calling `playlistItems.list`; lookup failure -> `[]`, not a throw) rather than re-testing pagination/Shorts-filtering/dedup logic that's already covered by `getAllVideosFromPlaylist`'s own tests.
- Verified via `test:unit` (all passing) and `tsc --noEmit` (no new errors).
