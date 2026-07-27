import test from "node:test";
import assert from "node:assert/strict";
import { convertToISO8601Duration } from "../../utils/convertToISO8601Duration.ts";

// Phase 7 of the refactor plan added these tests and, in doing so, found a
// real bug in the string-parsing branch: `time.split(":").reverse()` turns
// ["1","02","03"] (H,M,S) into ["03","02","1"] (S,M,H), but the code
// destructured position 0 into `hours` and position 2 into `seconds` as if
// the array were still in H,M,S order - swapping hours and seconds for any
// 3-part input, and mis-parsing 1- and 2-part input entirely. Confirmed
// against real content (`duration: "0:41:52"` in
// 10-years-of-design-systems-then-now/index.mdx) that this was live in
// production, generating a wrong schema.org VideoObject.duration
// (PT52H41M instead of PT41M52S) on effectively every video page. Fixed
// as a follow-up in the same session the bug was found, rather than
// scheduling it for later - see convertToISO8601Duration.ts.

test("convertToISO8601Duration converts whole seconds (numeric input) to ISO 8601", () => {
  assert.equal(convertToISO8601Duration(3723), "PT1H2M3S");
  assert.equal(convertToISO8601Duration(2700), "PT45M");
  assert.equal(convertToISO8601Duration(30), "PT30S");
});

test("convertToISO8601Duration parses an HH:MM:SS string correctly (regression: hours/seconds swap)", () => {
  assert.equal(convertToISO8601Duration("1:02:03"), "PT1H2M3S");
});

test("convertToISO8601Duration parses the real-world duration format found in content frontmatter", () => {
  // duration: "0:41:52" from 10-years-of-design-systems-then-now/index.mdx -
  // the exact case that surfaced the bug (was producing "PT52H41M").
  assert.equal(convertToISO8601Duration("0:41:52"), "PT41M52S");
});

test("convertToISO8601Duration parses a bare seconds-only string (regression: was misread as hours)", () => {
  assert.equal(convertToISO8601Duration("30"), "PT30S");
});

test("convertToISO8601Duration parses an MM:SS string (regression: seconds was dropped into hours)", () => {
  assert.equal(convertToISO8601Duration("45:10"), "PT45M10S");
});

test("convertToISO8601Duration returns PT0S for falsy input", () => {
  assert.equal(convertToISO8601Duration(undefined), "PT0S");
  assert.equal(convertToISO8601Duration(0), "PT0S");
  assert.equal(convertToISO8601Duration(""), "PT0S");
});

test("convertToISO8601Duration returns PT0S (not a bare 'PT') for a zero-valued HH:MM:SS string", () => {
  // Also fixed as part of the same change: the final `result || "PT0S"`
  // fallback never triggered because `result` was always at least the
  // non-empty, truthy string "PT" by that point. Now checked against the
  // actual parsed hours/minutes/seconds instead of the string.
  assert.equal(convertToISO8601Duration("0:0:0"), "PT0S");
});
