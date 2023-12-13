# designsystems.media

[![Scheduled Workflow](https://github.com/fcongson/designsystems.media/actions/workflows/schedule.yml/badge.svg?branch=main&event=schedule)](https://github.com/fcongson/designsystems.media/actions/workflows/schedule.yml)

## Scripts

The following scripts are found in `./scripts`

__Requirements__

A Google API key is needed in a local `.env` file

```
API_KEY="YOUR_API_KEY" // Replace with your API key
```

### `getVideos.js`

This gets video data from the video sources defined in `sources.json`. Videos defined in `ignore.json` will be skipped.

### `getImages.js`

This gets image data from the collected videos in `getVideos.js`

## How to run the video and image collection

```
yarn
yarn aggregate
```

## Astro content site

[Astro](https://astro.build/) provides the web experience for the sourced video data.

### How to run Astro

```
yarn
yarn dev
```
