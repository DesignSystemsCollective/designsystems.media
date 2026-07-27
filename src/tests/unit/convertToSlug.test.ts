import test from "node:test";
import assert from "node:assert/strict";
import { convertToSlug } from "../../utils/convertToSlug.ts";

// Phase 7 of the refactor plan: pinning convertToSlug's current behavior.
// Kept to cases with an unambiguous expected output - slugify's own
// whitespace-collapsing and charmap rules have edge cases (e.g. mixed
// punctuation runs) that aren't worth guessing at without being able to
// execute the test locally to confirm.

test("convertToSlug lowercases and hyphenates spaces", () => {
  assert.equal(convertToSlug("Design Systems Media"), "design-systems-media");
});

test("convertToSlug strips a lone apostrophe from the configured remove set", () => {
  // remove: /[*+~.()'"!:@]/g
  assert.equal(convertToSlug("Frank's Guide"), "franks-guide");
});

test("convertToSlug strips parentheses from the configured remove set", () => {
  assert.equal(convertToSlug("Take Two (Redux)"), "take-two-redux");
});

test("convertToSlug strips a colon from the configured remove set", () => {
  assert.equal(convertToSlug("Design Tokens: A Primer"), "design-tokens-a-primer");
});

test("convertToSlug collapses repeated whitespace into a single hyphen", () => {
  assert.equal(convertToSlug("too   many   spaces"), "too-many-spaces");
});

test("convertToSlug leaves an already-hyphenated, already-lowercase string alone", () => {
  assert.equal(convertToSlug("already-a-slug"), "already-a-slug");
});
