import { VercelRequest, VercelResponse } from "@vercel/node";

interface SearchResult {
  title: string;
  artist: string;
  genre: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  sampleLyric: string;
}

function extractYouTubeId(input: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = input.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Search YouTube via public search (no API key needed)
async function searchYouTube(query: string): Promise<SearchResult[]> {
  try {
    // Use YouTube's search endpoint via a simple approach
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " official audio")}`;
    
    const resp = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    
    const html = await resp.text();
    const results: SearchResult[] = [];
    
    // Extract video IDs and titles from YouTube search results HTML
    const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const titleRegex = /"title":{"runs":\[{"text":"([^"]+)"/g;
    
    const videoIds: string[] = [];
    let match;
    while ((match = videoIdRegex.exec(html)) !== null) {
      const id = match[1];
      if (!videoIds.includes(id)) videoIds.push(id);
    }
    
    const titles: string[] = [];
    while ((match = titleRegex.exec(html)) !== null) {
      titles.push(match[1]);
    }
    
    const count = Math.min(5, Math.min(videoIds.length, titles.length));
    for (let i = 0; i < count; i++) {
      const title = titles[i] || "Unknown Track";
      // Try to split "Title - Artist" format
      const parts = title.split(" - ");
      const songTitle = parts[0] || title;
      const artist = parts[1] || "Unknown Artist";
      
      results.push({
        title: songTitle,
        artist,
        genre: guessGenre(title),
        youtubeVideoId: videoIds[i],
        youtubeUrl: `https://www.youtube.com/watch?v=${videoIds[i]}`,
        sampleLyric: `♪ ${songTitle} ♪`,
      });
    }
    
    return results;
  } catch (err) {
    console.error("YouTube search error:", err);
    return [];
  }
}

function guessGenre(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("remix") || lower.includes("edm")) return "EDM";
  if (lower.includes("acoustic") || lower.includes("cover")) return "Acoustic";
  if (lower.includes("rock")) return "Rock";
  if (lower.includes("dangdut")) return "Dangdut";
  if (lower.includes("indonesia") || lower.includes("pop indo")) return "Pop Indo";
  return "Pop";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body || {};
  
  if (!query || !query.trim()) {
    return res.status(400).json({ error: "Query pencarian diperlukan." });
  }

  // If it's a direct YouTube URL, return it directly
  const directId = extractYouTubeId(query);
  if (directId) {
    return res.json({
      results: [{
        title: "YouTube Link",
        artist: "Direct Import",
        genre: "Pop",
        youtubeVideoId: directId,
        youtubeUrl: `https://www.youtube.com/watch?v=${directId}`,
        sampleLyric: "♪ Import dari YouTube ♪",
      }],
    });
  }

  // Search YouTube
  const results = await searchYouTube(query.trim());
  
  if (results.length === 0) {
    return res.json({
      results: [{
        title: query,
        artist: "Manual Import",
        genre: "Pop",
        youtubeVideoId: "",
        youtubeUrl: "",
        sampleLyric: "Tidak ditemukan di YouTube, tambah manual",
      }],
    });
  }

  return res.json({ results });
}
