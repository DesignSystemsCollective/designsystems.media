# design-systems-video-aggregator

## Requirements

A Google API key is needed in a local `.env` file

```
API_KEY="YOUR_API_KEY" // Replace with your API key
```

## How to run the aggregator

```
yarn
yarn aggregate
```

## What it's doing

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

## Markdown

The aggregator also creates a markdown file output to `data/output.md`. This markdown content will be used with an astro site where the video data will be hosted.
