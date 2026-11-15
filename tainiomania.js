/**
 * Tainiomania Provider for Nuvio
 * Handles searching, Cloudflare proxying, and extracting the 2nd player.
 */

function getStreams(tmdbId, mediaType, season, episode) {
    const BASE_URL = "https://tainio-mania.online";
    // Cloudflare Worker proxy to bypass anti-bot challenges and CORS on mobile/TV
    const PROXY_URL = "https://your-cf-worker.workers.dev/?url=";
    const TMDB_API_KEY = "YOUR_TMDB_KEY";

    // 1. Fetch TMDB metadata to resolve Greek/English title & release year
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;

    return fetch(tmdbUrl)
        .then(res => res.json())
        .then(meta => {
            const query = encodeURIComponent(meta.title || meta.name);
            const searchUrl = `${BASE_URL}/?s=${query}`;
            return fetch(PROXY_URL + encodeURIComponent(searchUrl));
        })
        .then(res => res.text())
        .then(searchHtml => {
            // Parse search results for the first matched post link
            const match = searchHtml.match(/
[\s\S]*? res.text())
        .then(postHtml => {
            // Tainiomania (Dooplay theme) lists multiple players via iframes or list items.
            // We want specifically the SECOND player.
            const iframes = [];
            const iframeRegex = /]+src="([^">]+)"/g;
            let match;
            while ((match = iframeRegex.exec(postHtml)) !== null) {
                iframes.push(match[1]);
            }

            // Fallback: check for player buttons data-src or player list items if iframes are loaded dynamically
            if (iframes.length < 2) {
                const playerOptionRegex = /data-(?:type|post|nume)="[^"]*"[^>]*data-link="([^"]+)"/g;
                while ((match = playerOptionRegex.exec(postHtml)) !== null) {
                    iframes.push(match[1]);
                }
            }

            // Select the second player (index 1), fallback to index 0 if only 1 exists
            const secondPlayerUrl = iframes[1] || iframes[0];

            if (!secondPlayerUrl) {
                throw new Error("Could not locate the second player embed source.");
            }

            const titleLabel = mediaType === 'tv' 
                ? `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')} - 2nd Player` 
                : 'Movie - 2nd Player';

            return [{
                name: "Tainiomania",
                title: titleLabel,
                url: secondPlayerUrl,
                quality: "1080p",
                isEmbed: true,
                headers: {
                    "Referer": BASE_URL,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            }];
        })
        .catch(err => {
            console.error("[Tainiomania Provider Error]:", err.message);
            return [];
        });
}

module.exports = { getStreams };
