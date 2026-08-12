import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import shared from "../../../content-aggregator/scripts/shared/shared.ts";

const { loadJsonFile, createDirectory, sanitizeTitle, replaceQuotesWithFancyQuotes, getPosterUrl, mapWithConcurrency } = shared;

function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

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

test("replaceQuotesWithFancyQuotes pairs quotes into proper opening/closing curly quotes", () => {
  assert.equal(
    replaceQuotesWithFancyQuotes(`Design Systems: The "Right" Way`),
    `Design Systems: The “Right” Way`,
  );
});

test("replaceQuotesWithFancyQuotes alternates open/close across multiple quoted phrases", () => {
  assert.equal(
    replaceQuotesWithFancyQuotes(`"First" and "Second"`),
    `“First” and “Second”`,
  );
});

test("replaceQuotesWithFancyQuotes leaves a title with no quotes untouched", () => {
  assert.equal(replaceQuotesWithFancyQuotes("Design Systems 101"), "Design Systems 101");
});

test("mapWithConcurrency: returns results in input order even when they resolve out of order", async () => {
  const items = [
    { id: "slow", ms: 30 },
    { id: "fast", ms: 0 },
  ];

  const results = await mapWithConcurrency(items, 2, async (item) => {
    await delay(item.ms, item.id);
    return item.id;
  });

  assert.deepEqual(results, ["slow", "fast"], "order must match input order, not completion order");
});

test("mapWithConcurrency: never runs more than `concurrency` workers at once", async () => {
  let active = 0;
  let maxActive = 0;

  await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (item) => {
    active++;
    maxActive = Math.max(maxActive, active);
    await delay(5, null);
    active--;
    return item;
  });

  assert.equal(maxActive, 2);
});

test("mapWithConcurrency: a concurrency higher than the item count doesn't spawn extra workers", async () => {
  const results = await mapWithConcurrency([1, 2], 10, async (item) => item * 2);
  assert.deepEqual(results, [2, 4]);
});

test("mapWithConcurrency: returns [] for an empty input array", async () => {
  const results = await mapWithConcurrency([], 4, async (item) => item);
  assert.deepEqual(results, []);
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
