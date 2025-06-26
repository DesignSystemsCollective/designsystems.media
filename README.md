# DesignSystems.media

![Total video count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.totalPosts&label=Videos&color=%23a688fa)
![Total Tags count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.totalTags&label=Tags&color=%23a688fa)
![Total Speakers count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.totalSpeakers&label=Speakers&color=%23a688fa)
![Total Backlog count](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fdesignsystems.media%2Fapi%2Fstats.json&query=stats.backlog&label=Backlog&color=%23a688fa)


[![Scheduled Video Workflow](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/schedule.yml/badge.svg?branch=main&event=schedule)](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/schedule.yml)
[![Scheduled Podcast Workflow](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/addPodcasts.yml/badge.svg)](https://github.com/DesignSystemsCollective/designsystems.media/actions/workflows/addPodcasts.yml)

![Latest batch of video thumbnails displayed in a grid](https://designsystems.media/social/dsm-linkedin-1200x627.jpg)

**A curated collection of design system resources and video content, powered by Astro.**

DesignSystems.media aggregates and showcases the best design system content from across the web, making it easy for designers and developers to discover talks, tutorials, and insights from the design systems community.

## ✨ Features

- **Automated Content Curation**: Automatically collects and updates video content from YouTube channels and playlists
- **Fast Static Site**: Built with Astro for optimal performance and SEO
- **Responsive Design**: Mobile-first approach with modern CSS
- **Social Media Ready**: Optimized sharing cards and metadata

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **Google API key** for YouTube Data API v3 ([Get one here](https://developers.google.com/youtube/v3/getting-started))

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/DesignSystemsCollective/designsystems.media.git
   cd designsystems.media
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env and add your Google API key
   echo 'API_KEY="YOUR_GOOGLE_API_KEY"' > .env
   ```

4. **Aggregate initial content**

   ```bash
   npm run aggregate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit [http://localhost:4321](http://localhost:4321) to see the site running locally.

## 📁 Project Structure

```
├── public/                  # Static assets served directly
│   ├── fonts/               # Custom web fonts
│   └── social/              # Social media cards and images
├── src/
│   ├── components/          # Reusable Astro components
│   ├── content/             # Content collections and schemas
│   ├── layouts/             # Page layout templates
│   ├── pages/               # File-based routing pages
│   ├── styles/              # Global CSS and design tokens
│   ├── templates/           # Content templates for posts
│   ├── tests/               # Unit tests for components and pages
│   └── utils/               # Helper functions and utilities
├── video-aggregator/        # Content collection automation
│   ├── data/                # Source configurations and outputs
│   │   ├── sources.json     # YouTube channels and playlists to monitor
│   │   ├── ignore.json      # YouTube videos to ignore
│   │   └── output.json      # Generated video metadata
│   └── scripts/             # Collection and processing scripts
├── astro.config.mjs         # Astro framework configuration
└── package.json             # Dependencies and scripts
```

## 🛠️ Development

### Available Scripts

| Command             | Description                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Start development server at `localhost:4321`     |
| `npm run build`     | Create production build                          |
| `npm run serve`     | Preview production build locally                 |
| `npm run aggregate` | Collect latest videos from configured sources    |
| `npm run test`      | Run end-to-end tests (requires production build) |

### Content Aggregation

The video aggregator automatically collects content from YouTube channels and playlists defined in:

- `video-aggregator/data/sources.json` - YouTube channels and playlists to monitor
- `video-aggregator/data/ignore.json` - YouTube videos to ignore.json

**Adding new sources:**

1. Edit the appropriate JSON file in `video-aggregator/data/`
2. Run `npm run aggregate` to collect content
3. The aggregated data will be saved to `video-aggregator/data/output.json`

## 🧪 Testing

End-to-end tests ensure the site functions correctly across different scenarios.

**Running tests:**

```bash
# Build the site first
npm run build
npm run serve

# In another terminal, run tests
npm run test
```

## 🚢 Deployment

The site is automatically deployed via Netlify when code is pushed to the main branch. Content aggregation runs weekly on Fridays via GitHub Actions to keep the video collection up to date.

**Manual deployment:**

```bash
npm run build
# Deploy the contents of the `dist/` folder to your hosting provider
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests if applicable
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to your branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Adding New Video Sources

To suggest new YouTube videos, channels or playlists:

1. Submit a [video contribution](https://github.com/DesignSystemsCollective/designsystems.media/issues/new?template=video-contribution.md) with the relevant YouTube URLs
2. (Optional) Include relevent tags and speakers
3. We'll review and add valuable sources to the collection

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design Systems Community for creating amazing content
- [Astro](https://astro.build/) for the fantastic framework
- All the creators whose content we feature

---

**Questions or suggestions?** Open an issue or reach out to [Design Systems Media](https://github.com/DesignSystemsCollective/designsystems.media).
