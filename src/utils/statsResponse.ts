/**
 * Pure response-body shaping for the /api/stats.json endpoint, pulled out
 * of the Astro API route (Phase 7 of the refactor plan) so it's testable
 * without going through the Astro request lifecycle. The route itself
 * still owns the Response/status/header wiring - that part is
 * Astro-endpoint-specific, not pure, and stays where it is.
 */

export function buildStatsSuccessBody<T>(stats: T): { stats: T } {
  return { stats };
}

export function buildStatsErrorBody(error: any): { error: string; message: string } {
  // Preserves the original route's exact (unguarded) `error.message` access -
  // if something other than an Error is ever thrown, `message` comes out
  // `undefined`, same as before this extraction. Not fixed here; out of
  // scope for a test-coverage-only phase.
  return {
    error: "Failed to generate library stats",
    message: error.message,
  };
}
