# designsystems.media

[![Scheduled Workflow](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/schedule.yml/badge.svg?branch=main&event=schedule)](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/schedule.yml)

![Latest batch of video thumbnails displayed in a grid](https://designsystems.media/social/dsm-linkedin-1200x627.jpg)

## Scripts

The following scripts are found in `./scripts`

**Requirements**

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
npm install
npm run aggregate
```

## Astro content site

[Astro](https://astro.build/) provides the web experience for the sourced video data.

### How to run Astro

```
npm install
npm run dev
```

### How to run tests

Build and serve the site

```
npm run build
npm run serve
```

Run the tests in another terminal

```
npm run test
```
