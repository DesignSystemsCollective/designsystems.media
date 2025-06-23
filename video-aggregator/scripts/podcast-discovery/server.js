// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const podcast = require('../podcast.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the discovery tool
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Load current sources
app.get('/api/sources', (req, res) => {
    try {
        const sourcesPath = path.join(__dirname, 'podcast-sources.json');
        if (fs.existsSync(sourcesPath)) {
            const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
            res.json(sources);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error loading sources:', error);
        res.status(500).json({ error: 'Failed to load sources' });
    }
});

// Save sources
app.post('/api/sources', (req, res) => {
    try {
        const sources = req.body;
        const sourcesPath = path.join(__dirname, 'podcast-sources.json');
        fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving sources:', error);
        res.status(500).json({ error: 'Failed to save sources' });
    }
});

// Search podcasts by title
app.get('/api/search/podcasts', async (req, res) => {
    try {
        const { q: query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        console.log(`Searching for podcasts: "${query}"`);
        
        const result = await podcast.searchPodcastByTitle(query);
        
        if (!result || !result.showData) {
            return res.json({ podcasts: [], episodes: [] });
        }

        // Format podcast data
        const podcastData = {
            id: result.showData.id,
            title: result.showData.title,
            description: result.showData.description || '',
            author: result.showData.author || '',
            feedUrl: result.showData.url,
            artwork: podcast.getPodcastArtwork(result.showData),
            categories: result.showData.categories || {},
            episodeCount: result.showData.episodeCount || 0,
            language: result.showData.language || 'en'
        };

        // Format episodes with more complete data
        const episodes = result.episodes.map(episode => ({
            id: episode.episodeId,
            title: episode.title,
            description: episode.description,
            podcastTitle: episode.podcastTitle,
            duration: episode.duration,
            durationSeconds: episode.durationSeconds,
            publishedAt: episode.publishedAt,
            audioUrl: episode.audioUrl,
            episodeUrl: episode.episodeUrl,
            artwork: episode.episodeImageUrl || episode.podcastImageUrl,
            feedUrl: episode.feedUrl,
            guid: episode.guid,
            season: episode.season,
            episode: episode.episode,
            explicit: episode.explicit,
            type: episode.type
        }));

        res.json({
            podcast: podcastData,
            episodes: episodes
        });

    } catch (error) {
        console.error('Error searching podcasts:', error);
        res.status(500).json({ error: 'Search failed', message: error.message });
    }
});

// Search episodes across multiple podcasts (general search)
app.get('/api/search/episodes', async (req, res) => {
    try {
        const { q: query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        console.log(`Searching for episodes: "${query}"`);
        
        // First, search for podcasts that match the query
        const result = await podcast.searchPodcastByTitle(query);
        
        if (!result || !result.episodes) {
            return res.json({ episodes: [] });
        }

        // Format episodes
        const episodes = result.episodes.map(episode => ({
            id: episode.episodeId,
            title: episode.title,
            description: episode.description,
            podcastTitle: episode.podcastTitle,
            duration: episode.duration,
            durationSeconds: episode.durationSeconds,
            publishedAt: episode.publishedAt,
            audioUrl: episode.audioUrl,
            episodeUrl: episode.episodeUrl,
            artwork: episode.episodeImageUrl || episode.podcastImageUrl,
            feedUrl: episode.feedUrl,
            guid: episode.guid,
            season: episode.season,
            episode: episode.episode,
            explicit: episode.explicit,
            type: episode.type,
            speakers: [] // You might want to extract this from description or maintain a mapping
        }));

        res.json({ episodes });

    } catch (error) {
        console.error('Error searching episodes:', error);
        res.status(500).json({ error: 'Search failed', message: error.message });
    }
});

// Get trending podcasts
app.get('/api/trending', async (req, res) => {
    try {
        const { max = 10 } = req.query;
        
        console.log(`Getting trending podcasts (max: ${max})`);
        
        const trendingData = await podcast.getTrendingPodcasts([], parseInt(max));
        
        const podcasts = trendingData.map(item => ({
            podcast: {
                id: item.showData.id,
                title: item.showData.title,
                description: item.showData.description || '',
                author: item.showData.author || '',
                feedUrl: item.showData.url,
                artwork: podcast.getPodcastArtwork(item.showData),
                categories: item.showData.categories || {},
                episodeCount: item.showData.episodeCount || 0,
                language: item.showData.language || 'en'
            },
            episodes: item.episodes.map(episode => ({
                id: episode.episodeId,
                title: episode.title,
                description: episode.description,
                podcastTitle: episode.podcastTitle,
                duration: episode.duration,
                durationSeconds: episode.durationSeconds,
                publishedAt: episode.publishedAt,
                audioUrl: episode.audioUrl,
                episodeUrl: episode.episodeUrl,
                artwork: episode.episodeImageUrl || episode.podcastImageUrl,
                feedUrl: episode.feedUrl,
                guid: episode.guid,
                season: episode.season,
                episode: episode.episode,
                explicit: episode.explicit,
                type: episode.type
            }))
        }));

        res.json({ podcasts });

    } catch (error) {
        console.error('Error getting trending podcasts:', error);
        res.status(500).json({ error: 'Failed to get trending podcasts', message: error.message });
    }
});

// Get podcast by feed URL
app.get('/api/podcast/by-feed', async (req, res) => {
    try {
        const { url: feedUrl } = req.query;
        
        if (!feedUrl) {
            return res.status(400).json({ error: 'Feed URL parameter is required' });
        }

        console.log(`Getting podcast by feed URL: ${feedUrl}`);
        
        const result = await podcast.getPodcastByFeedUrl(feedUrl);
        
        if (!result || !result.showData) {
            return res.json({ podcast: null, episodes: [] });
        }

        const podcastData = {
            id: result.showData.id,
            title: result.showData.title,
            description: result.showData.description || '',
            author: result.showData.author || '',
            feedUrl: result.showData.url,
            artwork: podcast.getPodcastArtwork(result.showData),
            categories: result.showData.categories || {},
            episodeCount: result.showData.episodeCount || 0,
            language: result.showData.language || 'en'
        };

        const episodes = result.episodes.map(episode => ({
            id: episode.episodeId,
            title: episode.title,
            description: episode.description,
            podcastTitle: episode.podcastTitle,
            duration: episode.duration,
            durationSeconds: episode.durationSeconds,
            publishedAt: episode.publishedAt,
            audioUrl: episode.audioUrl,
            episodeUrl: episode.episodeUrl,
            artwork: episode.episodeImageUrl || episode.podcastImageUrl,
            feedUrl: episode.feedUrl,
            guid: episode.guid,
            season: episode.season,
            episode: episode.episode,
            explicit: episode.explicit,
            type: episode.type
        }));

        res.json({
            podcast: podcastData,
            episodes: episodes
        });

    } catch (error) {
        console.error('Error getting podcast by feed URL:', error);
        res.status(500).json({ error: 'Failed to get podcast', message: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        apiKey: !!process.env.PODCAST_API_KEY,
        apiSecret: !!process.env.PODCAST_API_SECRET
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error', 
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎧 Podcast Discovery Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
    
    // Check environment variables
    if (!process.env.PODCAST_API_KEY || !process.env.PODCAST_API_SECRET) {
        console.warn('⚠️  Warning: PODCAST_API_KEY and PODCAST_API_SECRET environment variables not set');
        console.log('   Make sure to set these before making API calls');
    }
});

module.exports = app;