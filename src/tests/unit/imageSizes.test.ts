import test from "node:test";
import assert from "node:assert/strict";
import { BREAKPOINTS, IMAGE_WIDTHS, IMAGE_SIZES } from "../../utils/imageSizes.ts";

// Phase 7 of the refactor plan: imageSizes.ts is pure data, but the
// IMAGE_SIZES strings are template-interpolated from BREAKPOINTS. These
// tests pin that the interpolation is correct today and catch silent drift
// if either constant is edited independently of the other in the future.

test("BREAKPOINTS has the expected values", () => {
  assert.equal(BREAKPOINTS.mobile, 640);
  assert.equal(BREAKPOINTS.tablet, 768);
  assert.equal(BREAKPOINTS.desktop, 1024);
  assert.equal(BREAKPOINTS.large, 1440);
});

test("IMAGE_WIDTHS arrays are non-empty and ascending", () => {
  for (const widths of Object.values(IMAGE_WIDTHS)) {
    assert.ok(widths.length > 0);
    const sorted = [...widths].sort((a, b) => a - b);
    assert.deepEqual(widths, sorted, `expected ${widths} to already be ascending`);
  }
});

test("IMAGE_SIZES.medium interpolates BREAKPOINTS.tablet", () => {
  assert.equal(IMAGE_SIZES.medium, `(max-width: ${BREAKPOINTS.tablet}px) 320px, 640px`);
  assert.equal(IMAGE_SIZES.medium, "(max-width: 768px) 320px, 640px");
});

test("IMAGE_SIZES.large interpolates BREAKPOINTS.mobile and BREAKPOINTS.desktop", () => {
  assert.equal(
    IMAGE_SIZES.large,
    `(max-width: ${BREAKPOINTS.mobile}px) 320px, (max-width: ${BREAKPOINTS.desktop}px) 640px, 1280px`,
  );
});

test("IMAGE_SIZES.card interpolates BREAKPOINTS.mobile and BREAKPOINTS.desktop", () => {
  assert.equal(
    IMAGE_SIZES.card,
    `(max-width: ${BREAKPOINTS.mobile}px) 240px, (max-width: ${BREAKPOINTS.desktop}px) 540px, 900px`,
  );
});

test("IMAGE_SIZES.artwork and podcastMedium/podcastLarge interpolate BREAKPOINTS.desktop", () => {
  assert.equal(IMAGE_SIZES.artwork, `(max-width: ${BREAKPOINTS.desktop}px) 200px, 320px`);
  assert.equal(IMAGE_SIZES.podcastMedium, `(max-width: ${BREAKPOINTS.desktop}px) 150px, 200px`);
  assert.equal(IMAGE_SIZES.podcastLarge, `(max-width: ${BREAKPOINTS.desktop}px) 200px, 250px`);
});

test("IMAGE_SIZES.thumbnail/small/podcastSmall are fixed (no breakpoint)", () => {
  assert.equal(IMAGE_SIZES.thumbnail, "70px");
  assert.equal(IMAGE_SIZES.small, "120px");
  assert.equal(IMAGE_SIZES.podcastSmall, "150px");
});
