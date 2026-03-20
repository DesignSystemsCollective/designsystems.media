# DesignSystems.media
![Total media](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.totalMedia&label=All%20media&color=%23a688fa)
![Total video count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.videos&label=Videos&color=%23a688fa)
![Total podcast episode count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.podcastEpisodes&label=Podcasts&color=%23a688fa)
![Total podcast show count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.podcastShows&label=Shows&color=%23a688fa)
![Total Tags count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.tags&label=Tags&color=%23a688fa)
![Total Speakers count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.speakers&label=Speakers&color=%23a688fa)
![Total Backlog count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.drafts&label=Backlog&color=%23a688fa)

[![Scheduled Video Workflow](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/schedule.yml/badge.svg)](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/schedule.yml)
[![Scheduled Podcast Workflow](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/addPodcasts.yml/badge.svg)](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/addPodcasts.yml)

![Latest batch of video thumbnails displayed in a grid](https://designsystems.media/social/dsm-linkedin-1200x627.jpg)

**A curated collection of design system resources and video content, powered by Astro.**

DesignSystems.media aggregates and showcases the best design system content from across the web, making it easy for designers and developers to discover talks, tutorials, and insights from the design systems community.

## Features

- Automated content curation from YouTube channels and playlists
- Static Astro site optimized for performance, SEO, and search indexing
- Shared content-domain layer for pages, APIs, and metadata
- Prebuild content validation for assets and internal references
- Responsive UI with reusable Astro and React components
- Social media image generation during build

## Quick Start

### Prerequisites

- Node.js v20 or higher
- Google API key for YouTube Data API v3 ([Get one here](https://developers.google.com/youtube/v3/getting-started))

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/DesignSystemsCollective/designsystems.media.git
   cd designsystems.media
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up environment variables

   ```bash
   cp .env.example .env
   ```

4. Validate local content

   ```bash
   npm run validate:content
   ```

5. Aggregate initial content

   ```bash
   npm run aggregate
   ```

6. Start development server

   ```bash
   npm run dev
   ```

Visit [http://localhost:4321](http://localhost:4321) to see the site running locally.

## Architecture

The site now uses a shared content-domain layer so content collections are loaded and indexed in one place instead of being queried directly from route files.

- `src/lib/content-domain/loaders.ts`: one-pass collection loading
- `src/lib/content-domain/normalizers.ts`: taxonomy, slug, and date normalization
- `src/lib/content-domain/selectors.ts`: derived indexes and selectors
- `src/lib/content-domain/index.ts`: public query interface used by pages, APIs, and components
- `scripts/lib/content-validation.mjs`: reusable validation logic for build-time checks

This keeps Astro `getCollection()` access inside a single boundary and removes duplicated route logic for tags, speakers, shows, playlists, stats, and sitemap generation.

Decision records for the major refactors live under [docs/adr/](./docs/adr/README.md).

## Project Structure

```text
├── public/                  # Static assets served directly
│   ├── fonts/               # Custom web fonts
│   └── social/              # Social media cards and generated images
├── scripts/                 # Build-time validation and maintenance scripts
│   └── lib/                 # Shared script helpers
├── src/
│   ├── components/          # Reusable Astro and React components
│   ├── content/             # MDX content collections and schemas
│   ├── layouts/             # Page layout templates
│   ├── lib/
│   │   └── content-domain/  # Shared content query layer
│   ├── pages/               # File-based routes and API endpoints
│   ├── styles/              # Global CSS, themes, and tokens
│   ├── templates/           # Content templates for posts
│   ├── tests/               # Unit, smoke, and visual regression tests
│   └── utils/               # General helpers
├── video-aggregator/        # Content ingestion automation
│   ├── data/                # Source configurations and generated outputs
│   └── scripts/             # Collection and processing scripts
├── docs/
│   └── adr/                 # Architecture decision records
├── astro.config.mjs         # Astro framework configuration
└── package.json             # Dependencies and scripts
```

## Development

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Astro development server at `localhost:4321` |
| `npm run validate:content` | Validate content assets and internal references |
| `npm run build` | Run content validation, then create a production build |
| `npm run preview` | Preview the production build with Astro |
| `npm run serve` | Serve the built `dist/` directory |
| `npm run aggregate` | Collect the latest video metadata from configured sources |
| `npm run videos` | Run the video ingestion script |
| `npm run podcasts` | Run the podcast ingestion script |
| `npm run images` | Fetch or generate content images |
| `npm run test:unit` | Run unit tests for content selectors and validation |
| `npm run test:smoke` | Build the site, then verify generated pages and internal links |
| `npm run test:visual` | Build the site, then run curated Playwright screenshot checks |
| `npm run test:visual:update` | Rebuild the site and refresh Playwright screenshot baselines |

### Build and Validation Flow

`npm run build` now runs validation before Astro starts:

1. `npm run validate:content`
2. `astro build`

Validation currently checks for:

- Missing local image assets referenced from frontmatter
- Duplicate slugs inside a collection
- Playlist items that reference missing content
- Podcast episodes that reference unknown `showSlug` values

### Content Aggregation

The ingestion scripts collect data from:

- `video-aggregator/data/sources.json` for YouTube channels and playlists to monitor
- `video-aggregator/data/ignoreID.json` for YouTube videos to ignore

Adding new sources:

1. Edit the appropriate JSON file in `video-aggregator/data/`
2. Run `npm run aggregate`
3. Review the generated output in `video-aggregator/data/output.json`

## Testing

### Unit Tests

Unit coverage lives under `src/tests/unit/` and focuses on:

- taxonomy normalization and slug generation
- selector and index generation in the content domain
- content validation behavior

Run them with:

```bash
npm run test:unit
```

### Smoke Tests

Smoke coverage lives under `src/tests/smoke/` and verifies that the built site is intact:

- every generated HTML page loads successfully
- internal links resolve without 4xx or 5xx responses

Run it with:

```bash
npm run test:smoke
```

### Visual Regression Tests

Visual coverage lives under `src/tests/visual/` and snapshots a curated set of stable routes in Chromium desktop and mobile viewports.

Covered surfaces currently include:

- homepage
- `/all/`
- `/podcast/`
- one representative video detail page
- one representative podcast episode page
- one show page
- one tag page
- one speaker page
- one playlist page

To keep baselines stable, the visual tests:

- force reduced motion and disable CSS transitions
- wait for fonts and page chrome before capturing screenshots
- mask animated homepage counters
- mask dynamic content grids on `/all/` and `/podcast/`

Run the visual suite with:

```bash
npm run test:visual
```

Refresh baselines locally with:

```bash
npm run test:visual:update
```

## Deployment

The site is deployed via Netlify when code is pushed to the main branch. Content aggregation runs on scheduled GitHub Actions to keep the collection up to date.

Manual deployment:

```bash
npm run build
```

Deploy the contents of `dist/` to your hosting provider.

## Contributing

We welcome contributions. A typical change flow is:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run test:unit`, `npm run test:smoke`, and `npm run build`
5. Commit and push your branch
6. Open a Pull Request

### Working With Content

When adding or editing MDX content:

- run `npm run validate:content` before opening a PR
- ensure local image references in frontmatter actually exist
- ensure podcast episodes reference a valid `showSlug`
- ensure playlist items reference valid `media` or `podcast` slugs

### Working With App Code

When adding new pages or APIs:

- consume data through `src/lib/content-domain/`
- avoid direct `getCollection()` usage outside the content-domain layer
- keep route files focused on shaping page props, not indexing collections
- run `npm run test:visual` when changing layout, styling, or component rendering

### Adding New Video Sources

To suggest new YouTube videos, channels, or playlists:

1. Submit a [video contribution](https://github.com/DesignSystemsCollective/designsystems.media/issues/new?template=video-contribution.md) with the relevant YouTube URLs
2. Optionally include relevant tags and speakers
3. We will review and add valuable sources to the collection

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- Design Systems Community for creating amazing content
- [Astro](https://astro.build/) for the framework
- All the creators whose content we feature

Questions or suggestions? Open an issue or reach out to [Design Systems Media](https://github.com/DesignSystemsCollective/designsystems.media).
