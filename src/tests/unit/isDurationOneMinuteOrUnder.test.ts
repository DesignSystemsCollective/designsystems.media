import test from "node:test";
import assert from "node:assert/strict";
import { isDurationOneMinuteOrUnder } from "../../utils/isDurationOneMinuteOrUnder.ts";

// Phase 7 of the refactor plan: pinning isDurationOneMinuteOrUnder's current
// behavior, including a quirk noted below rather than fixed (out of scope
// for a test-coverage-only phase).

test("isDurationOneMinuteOrUnder returns true for numeric seconds at or under 60", () => {
  assert.equal(isDurationOneMinuteOrUnder(60), true);
  assert.equal(isDurationOneMinuteOrUnder(30), true);
});

test("isDurationOneMinuteOrUnder returns false for numeric seconds over 60", () => {
  assert.equal(isDurationOneMinuteOrUnder(61), false);
  assert.equal(isDurationOneMinuteOrUnder(120), false);
});

test("isDurationOneMinuteOrUnder parses HH:MM:SS strings", () => {
  assert.equal(isDurationOneMinuteOrUnder("0:01:00"), true);
  assert.equal(isDurationOneMinuteOrUnder("0:00:45"), true);
  assert.equal(isDurationOneMinuteOrUnder("0:01:01"), false);
  assert.equal(isDurationOneMinuteOrUnder("1:00:00"), false);
});

test("isDurationOneMinuteOrUnder returns false for a malformed string", () => {
  assert.equal(isDurationOneMinuteOrUnder("not-a-duration"), false);
});

test("isDurationOneMinuteOrUnder returns false for falsy input, including numeric 0 (known quirk, pinned not fixed)", () => {
  // A 0-second duration is, by the stated definition ("60 seconds or
  // less"), one minute or under - but the `if (!duration) return false;`
  // guard treats numeric 0 the same as undefined/null/"" and short-circuits
  // to false before the <= 60 comparison ever runs. Pinning as-is; fixing
  // the definitional edge case is out of scope for this test-coverage phase.
  assert.equal(isDurationOneMinuteOrUnder(0), false);
  assert.equal(isDurationOneMinuteOrUnder(undefined), false);
  assert.equal(isDurationOneMinuteOrUnder(""), false);
});
