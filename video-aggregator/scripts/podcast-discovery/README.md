# 🎧 Podcast Discovery Tool Setup

A fast, local tool for discovering podcasts and managing your sources using the Podcast Index API.

## 📋 Prerequisites

- Node.js (v14 or higher)
- Podcast Index API credentials (get them from [podcastindex.org](https://podcastindex.org/))

## 🚀 Quick Setup

### 1. Create Project Directory
```bash
mkdir podcast-discovery-tool
cd podcast-discovery-tool
```

### 2. Save Your Files
Create these files in your project directory:
- `server.js` (the Express server code)
- `podcast.js` (your existing podcast API code)
- `podcast-sources.json` (your existing sources file)
- `package.json` (dependencies)

### 3. Create Public Directory
```bash
mkdir public
```

Save the HTML discovery tool as `public/index.html`.

### 4. Install Dependencies
```bash
npm install
```

### 5. Set Environment Variables
Create a `.env` file in your project root:
```bash
# .env
PODCAST_API_KEY=your_podcast_index_api_key_here
PODCAST_API_SECRET=your_podcast_index_api_secret_here
PORT=3000
NODE_ENV=development
```

Or set them directly when running:
```bash
PODCAST_API_KEY=your_key PODCAST_API_SECRET=your_secret npm start
```

### 6. Start the Server
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## 🌐 Using the Tool

1. **Open your browser** to `http://localhost:3000`
2. **Search for podcasts** using keywords
3. **Toggle between "Search Podcasts" and "Search Episodes"** modes
4. **Add individual episodes** or **entire podcast feeds**
5. **Manage your sources** - view, remove, or export
6. **Export updated sources.json** file to replace your existing one

## 📁 Project Structure

```
podcast-discovery-tool/
├── server.js              # Express server
├── podcast.js             # Your existing Podcast Index API code
├── podcast-sources.json   # Your current sources
├── package.json           # Dependencies
├── .env                   # Environment variables (create this)
└── public/
    └── index.html         # Discovery tool frontend
```

## 🔧 API Endpoints

Your server provides these endpoints:

- `GET /` - Serves the discovery tool
- `GET /api/sources` - Get current sources
- `POST /api/sources` - Save sources
- `GET /api/search/podcasts?q=query` - Search for podcasts
- `GET /api/search/episodes?q=query` - Search for episodes
- `GET /api/trending?max=10` - Get trending podcasts
- `GET /api/podcast/by-feed?url=feedUrl` - Get podcast by feed URL
- `GET /api/health` - Health check

## ✨ Features

### Search & Discovery
- **Real-time search** with your Podcast Index API
- **Dual search modes**: Find podcasts or episodes
- **Rich episode cards** with artwork, descriptions, and metadata
- **Smart filtering** to avoid duplicates

### Source Management
- **Add individual episodes** for one-off content
- **Add entire podcast feeds** to ingest all episodes
- **Remove sources** with confirmation
- **Export sources.json** for your Astro site
- **Persistent storage** (server + localStorage backup)

### Developer-Friendly
- **Local development** - runs on localhost
- **Error handling** with fallbacks
- **Environment-based configuration**
- **Clean API structure** for easy integration

## 🔍 Troubleshooting

### API Credentials
Check if your credentials are set:
```bash
curl http://localhost:3000/api/health
```

### CORS Issues
The server includes CORS middleware, but if you have issues:
- Make sure you're accessing via `http://localhost:3000`
- Check browser console for errors

### Search Not Working
- Verify your Podcast Index API credentials
- Check server logs for API errors
- Test with simple queries first (e.g., "design")

## 🎯 Integration with Astro

Once you've curated your sources:

1. **Export the JSON** from the tool
2. **Replace your `podcast-sources.json`** file
3. **Run your Astro build** to ingest new content

The tool maintains the same JSON structure as your existing sources file, so integration is seamless!

## 🛠 Development

To modify the tool:

- **Frontend changes**: Edit `public/index.html`
- **API changes**: Edit `server.js`
- **Podcast API changes**: Edit `podcast.js`

The server will auto-reload with `npm run dev` when you make changes.

---

**Happy podcast hunting! 🎙️**