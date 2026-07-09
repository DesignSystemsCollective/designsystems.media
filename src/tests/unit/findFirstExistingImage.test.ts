import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { findFirstExistingImage, IMAGE_FILENAME_PRIORITY } from "../../utils/findFirstExistingImage.ts";

function mkTmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Phase 5 of the refactor plan (bundled fix): generateSocialImages.ts used
// to check ["maxresdefault.jpg", "hqdefault.jpg", "poster.jpg"] in that
// order - preferring two legacy filenames the current pipeline never
// produces over the current, authoritative poster.jpg. Verified against the
// real content directory that 0 folders have either legacy file without
// poster.jpg also present, so the old order silently picked a stale image
// for every folder that had both. Priority is now poster.jpg first.

test("prefers poster.jpg even when legacy filenames are also present", () => {
  const dir = mkTmpDir("dsm-social-image-priority-");
  fs.writeFileSync(path.join(dir, "hqdefault.jpg"), "x");
  fs.writeFileSync(path.join(dir, "maxresdefault.jpg"), "x");
  fs.writeFileSync(path.join(dir, "poster.jpg"), "x");

  return findFirstExistingImage(dir).then((found) => {
    assert.equal(found, path.join(dir, "poster.jpg"));
  });
});

test("falls back to a legacy filename when poster.jpg is absent", async () => {
  const dir = mkTmpDir("dsm-social-image-fallback-");
  fs.writeFileSync(path.join(dir, "hqdefault.jpg"), "x");

  const found = await findFirstExistingImage(dir);
  assert.equal(found, path.join(dir, "hqdefault.jpg"));
});

test("returns null when none of the priority filenames exist", async () => {
  const dir = mkTmpDir("dsm-social-image-none-");

  const found = await findFirstExistingImage(dir);
  assert.equal(found, null);
});

test("IMAGE_FILENAME_PRIORITY puts poster.jpg first", () => {
  assert.equal(IMAGE_FILENAME_PRIORITY[0], "poster.jpg");
});
