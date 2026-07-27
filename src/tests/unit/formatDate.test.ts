import test from "node:test";
import assert from "node:assert/strict";
import { formatDate } from "../../utils/formatDate.ts";

// Phase 7 of the refactor plan: pinning formatDate's current behavior.
// Dates are constructed relative to the real current year (rather than a
// fixed year) so this test doesn't silently go stale/wrong once the current
// year moves on.

test("formatDate omits the year for a date in the current year", () => {
  const currentYear = new Date().getFullYear();
  const date = new Date(currentYear, 0, 15); // Jan 15, this year
  assert.equal(formatDate(date), "Jan 15");
});

test("formatDate includes the year for a date in a past year", () => {
  const date = new Date(2020, 0, 15); // Jan 15, 2020
  assert.equal(formatDate(date), "Jan 15, 2020");
});

test("formatDate includes the year for a date in a future year", () => {
  const currentYear = new Date().getFullYear();
  const date = new Date(currentYear + 1, 5, 1);
  assert.equal(formatDate(date), `Jun 1, ${currentYear + 1}`);
});

test("formatDate returns an empty string for non-Date input", () => {
  // @ts-expect-error - deliberately passing an invalid type to test the guard
  assert.equal(formatDate("2024-01-15"), "");
  // @ts-expect-error
  assert.equal(formatDate(null), "");
  // @ts-expect-error
  assert.equal(formatDate(undefined), "");
});
