import test from "node:test";
import assert from "node:assert/strict";
import { formatDuration } from "../../utils/formatDuration.ts";

// Phase 7 of the refactor plan: pinning formatDuration's current behavior.
// Note this is src/utils/formatDuration.ts - a *display* formatter that
// expects an "hh:mm:ss" string - and is a distinct implementation from
// content-aggregator's shared/shared.ts formatSecondsAsDuration (unified in Phase 3).
// The two were never in scope to unify; this one's input contract is a
// preformatted string, not raw seconds.

test("formatDuration returns seconds-only for durations under a minute", () => {
  assert.equal(formatDuration("0:00:45"), "45s");
});

test("formatDuration returns 'Nm Ns' for durations under 5 minutes with a nonzero seconds remainder over 9", () => {
  assert.equal(formatDuration("0:03:25"), "3m 25s");
});

test("formatDuration drops seconds for durations under 5 minutes when seconds is single-digit", () => {
  assert.equal(formatDuration("0:03:05"), "3m");
});

test("formatDuration drops seconds for durations of 5 minutes or more (hours === 0)", () => {
  assert.equal(formatDuration("0:12:45"), "12m");
});

test("formatDuration drops minutes-remainder seconds entirely once hours are involved", () => {
  assert.equal(formatDuration("1:15:30"), "1h 15m");
  assert.equal(formatDuration("2:00:00"), "2h 0m");
});

test("formatDuration returns '?' for undefined or null input", () => {
  assert.equal(formatDuration(undefined), "?");
  // @ts-expect-error - deliberately testing the null branch
  assert.equal(formatDuration(null), "?");
});

test("formatDuration returns '?' for a string that isn't hh:mm:ss shaped", () => {
  assert.equal(formatDuration("not-a-duration"), "?");
  assert.equal(formatDuration(""), "?");
});

test("formatDuration returns '?' for numeric input (known quirk, pinned not fixed)", () => {
  // The function accepts `string | number`, but numbers are stringified with
  // String(duration) - e.g. 3661 becomes "3661", which never matches the
  // hh:mm:ss regex (no colons). Every numeric input therefore falls through
  // to the invalid-format branch. This looks like dead code in the type
  // signature rather than working behavior; pinning as-is since fixing it is
  // out of scope for a test-coverage-only phase.
  assert.equal(formatDuration(3661), "?");
});
