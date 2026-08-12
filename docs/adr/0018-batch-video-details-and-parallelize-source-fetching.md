# ADR 0018: Batch videos.list calls; fetch sources concurrently

## Status

Accepted

## Context

Two remaining, lower-priority items from the API-usage discussion that started with ADR 0017:

1. **`videos.list` was called once per new video.** It's a "list" endpoint that accepts up to 50 comma-separated video IDs for the same 1 quota unit as a single-ID call - so a page with 20 new videos cost 20 units when it could cost 1.
2. **`getVideos.ts`'s `main()` processed every configured source sequentially** (`for...of` + `await`), one full fetch-then-write cycle at a time. With 18 sources, total run time was the sum of every source's network latency rather than roughly the slowest one. This doesn't affect quota, only wall-clock time.

## Decision

**Batched `videos.list` calls per page.** `getAllVideosFromPlaylist` now collects every new (not-yet-imported) video ID on a playlist page first, then fetches all of their descriptions/durations in one `youtube.videos.list({ id: "id1,id2,...", ... })` call via a new `fetchVideoDetailsBatch` helper, instead of fetching inline as each item is found. Chunks defensively at 50 IDs per call even though a single page (capped at `maxResults: 50`) never exceeds that. Since `getAllVideosFromChannel` already delegates to `getAllVideosFromPlaylist` (ADR 0017), it gets this for free. Incidental robustness improvement: a video ID missing from the batched response (e.g. removed between the two calls) now resolves to `undefined` via a Map lookup instead of crashing on `response.data.items[0]` being empty.

**Fetch sources concurrently, apply results sequentially in original order.** `getVideos.ts`'s `main()` now fetches all sources through a new `mapWithConcurrency(items, concurrency, worker)` helper in `shared.ts` (a small in-house bounded worker pool - no new dependency, consistent with this codebase's existing "no ts-node/tsx" preference for not reaching for a package over a contained helper), capped at `SOURCE_FETCH_CONCURRENCY = 4`. `mapWithConcurrency` returns results indexed to match the input array regardless of completion order, so the second phase - writing each source's `.mdx` files via `processVideos` - still runs in the exact same fixed `sourcesData` order as the old fully-sequential version. This was a deliberate design choice, not an accident: it means parallelizing only speeds up the network-bound fetch phase and leaves the file-writing phase's behavior byte-for-byte identical to before.

**Verified this is safe to parallelize** by checking that `generateMdxFile` (called from `processVideos`) uses only synchronous Node fs calls (`existsSync`, `mkdirSync`, `writeFileSync`) with no `await` anywhere in its body - so even though multiple sources' fetches now resolve in an unpredictable order, each source's own file-writing step still runs start-to-finish without another source's code interleaving into it (JS's run-to-completion guarantee for synchronous code). There's also no shared mutable state across sources here needing reconciliation - unlike `getPodcasts.ts`'s `ShowManager`, each video source's output is independent of every other source's.

**`getPodcasts.ts` was deliberately NOT parallelized in this change.** Its `main()` Phase 1 loop calls `dataProcessors.processFeedSource`/`processSearchSource`/`processTrendingSource`, each of which interleaves the network fetch (`getPodcastByFeedUrl` etc.) with the apply step (`showManager.createShow` + `generateShowMdx`) inside one function, rather than keeping them separable the way `getVideos.ts`'s handler/processVideos split already did. Naively parallelizing as-is would make `showManager.createShow`'s dedup resolution order depend on network timing instead of `podcast-sources.json`'s fixed order - if two different sources ever resolve to the same underlying show (a real, designed-for case: `ShowManager.findExisting` already checks by id/feedUrl/slug specifically to handle it), *which* source's version of that show's metadata wins would become non-deterministic between runs. Fixing this properly would mean splitting `dataProcessors`' fetch and apply steps apart - a larger, separate change touching the exact functions the ADR 0006 null-feed crash-guard regression test covers, not a mechanical extension of this one. Left as a flagged follow-up, not done silently and not silently skipped.

## Consequences

- A page with N new videos now costs `ceil(N/50)` `videos.list` calls instead of N.
- Wall-clock run time for `npm run videos`/`npm run aggregate` should drop roughly proportional to the concurrency cap (up to ~4x, in practice less due to per-source variance and shared rate limiting), with zero change to quota cost or output content.
- `content-aggregator-youtube-api.test.mjs` gained a test asserting three new videos on one page produce exactly one batched `videos.list` call with all three IDs comma-joined, and every existing `state.videos` mock was updated to the new request/response shape (comma-joined `id` in, an array of ID-tagged items out) via a shared `videosListResponder` test helper.
- `content-aggregator-shared.test.mjs` gained direct coverage of `mapWithConcurrency`: order preservation under out-of-order completion, the concurrency cap actually being respected, and small-input/empty-input edge cases.
- Verified via `test:unit` (all passing) and `tsc --noEmit` (no new errors).
