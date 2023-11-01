# design-systems-video-aggregator

[![Scheduled Workflow](https://github.com/fcongson/design-systems-video-aggregator/actions/workflows/schedule.yml/badge.svg?branch=main&event=schedule)](https://github.com/fcongson/design-systems-video-aggregator/actions/workflows/schedule.yml)

## Video aggregator

Located in `/scripts/index.js`, the video aggregrator is what retrieves data from the video sources defined in `/scripts/sources.json`.

### Requirements

A Google API key is needed in a local `.env` file

```
API_KEY="YOUR_API_KEY" // Replace with your API key
```

### How to run the aggregator

```
yarn
npm run aggregate
```

### What the aggregator is doing

The `scripts/sources.json` file contains a list of sources, currently YouTube channels or playlists, and their corresponding urls.

`scripts/index.js` will use the `googleapis` to retrieve video data from those sources.

Once video data retrieval has completed, the data collected will get output to `data/output.json` in the following format:

```
[
  {
    "title": "Video 1 Title",
    "description": "Description for Video 1",
    "thumbnails": {
      "default": {
        "url": "https://example.com/default_thumbnail.jpg"
      },
      "medium": {
        "url": "https://example.com/medium_thumbnail.jpg"
      },
      "high": {
        "url": "https://example.com/high_thumbnail.jpg"
      }
    }
  },
  {
    "title": "Video 2 Title",
    "description": "Description for Video 2",
    "thumbnails": {
      "default": {
        "url": "https://example.com/default_thumbnail_2.jpg"
      },
      "medium": {
        "url": "https://example.com/medium_thumbnail_2.jpg"
      },
      "high": {
        "url": "https://example.com/high_thumbnail_2.jpg"
      }
    }
  },
  // ... (more video objects)
]
```

### Markdown output

The aggregator also creates a markdown file output to `data/output.md`. This markdown content will be used with an astro site where the video data will be hosted.

## Astro content site

[Astro](https://astro.build/) provides the web experience for the sourced video data.

### How to run Astro

```
yarn
yarn dev
```
