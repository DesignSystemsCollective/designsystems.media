import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import shared from "../../../video-aggregator/scripts/shared.ts";

const { loadJsonFile, createDirectory, sanitizeTitle, getPosterUrl } = shared;

test("loadJsonFile returns [] when the file does not exist", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsm-shared-"));
  assert.deepEqual(loadJsonFile(path.join(tmp, "missing.json")), []);
});

test("loadJsonFile parses an existing file", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsm-shared-"));
  const filePath = path.join(tmp, "data.json");
  fs.writeFileSync(filePath, JSON.stringify([{ id: 1 }]));
  assert.deepEqual(loadJsonFile(filePath), [{ id: 1 }]);
});

test("createDirectory creates nested directories and is a no-op if they already exist", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dsm-shared-"));
  const nested = path.join(tmp, "a", "b", "c");

  createDirectory(nested);
  assert.ok(fs.existsSync(nested));

  // Second call should not throw even though the directory already exists.
  createDirectory(nested);
  assert.ok(fs.existsSync(nested));
});

test("sanitizeTitle strips quotes, colons, and other punctuation", () => {
  assert.equal(
    sanitizeTitle(`DS: The "Right" Way #1 (v2)`),
    "DS The Right Way 1 v2",
  );
});

test("getPosterUrl prefers maxres, falls back to an upscaled high thumbnail, then empty string", () => {
  assert.equal(
    getPosterUrl({
      maxres: { url: "https://img/max.jpg" },
      high: { url: "https://img/hqdefault.jpg" },
    }),
    "https://img/max.jpg",
  );
  assert.equal(
    getPosterUrl({ high: { url: "https://img/hqdefault.jpg" } }),
    "https://img/maxresdefault.jpg",
  );
  assert.equal(getPosterUrl({}), "");
});
