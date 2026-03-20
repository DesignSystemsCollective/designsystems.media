import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  loadContentEntries,
  validateContentEntries,
} from "../../../scripts/lib/content-validation.mjs";

async function writeEntry(root, collection, slug, body) {
  const dir = path.join(root, collection, slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.mdx"), body);
}

test("content validation catches missing assets, duplicate slugs, playlist refs, and show refs", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dsm-content-"));

  for (const collection of ["media", "podcast", "show", "playlists"]) {
    await fs.mkdir(path.join(root, collection), { recursive: true });
  }

  await writeEntry(
    root,
    "media",
    "video-entry",
    `---
title: Video
publishedAt: 2025-01-01
image: "./missing.jpg"
localImages: true
draft: false
---
`,
  );

  await writeEntry(
    root,
    "show",
    "show-entry",
    `---
title: Show
description: Desc
feedUrl: https://example.com/feed.xml
dateAdded: 2025-01-01
lastUpdate: 2025-01-02
categories: [Podcast]
guid: show-guid
type: show
draft: false
---
`,
  );

  await writeEntry(
    root,
    "podcast",
    "episode-entry",
    `---
title: Episode
publishedAt: 2025-01-03
localImages: false
podcastTitle: Podcast
showSlug: missing-show
hasEpisodeImage: false
draft: false
---
`,
  );

  await writeEntry(
    root,
    "playlists",
    "playlist-entry",
    `---
name: Playlist
description: Curated
items:
  - type: media
    slug: missing-video
draft: false
---
`,
  );

  const entries = await loadContentEntries(root);
  entries.media.push({
    ...entries.media[0],
  });

  const errors = await validateContentEntries(entries);
  const messages = errors.map((error) => error.message).join("\n");

  assert.match(messages, /references missing asset/);
  assert.match(messages, /Duplicate slug "video-entry"/);
  assert.match(messages, /references unknown showSlug "missing-show"/);
  assert.match(messages, /references missing media slug "missing-video"/);
});
