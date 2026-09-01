// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// SoundCloud Downloader — Scrape client_id dari soundcloud.com, resolve via API v2
// No API key needed, free, self-hosted

import axios from "axios";

// Cache client_id supaya tidak scrape ulang setiap request
let cachedClientId = null;
let cachedVersion = null;

async function getClientId() {
  try {
    const { data: html } = await axios.get("https://soundcloud.com/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" },
      timeout: 10000,
    });

    const version = html.match(/<script>window\.__sc_version="(\d{10})"<\/script>/)?.[1];
    if (cachedClientId && cachedVersion === version) {
      return cachedClientId;
    }

    const scriptMatches = [...html.matchAll(/<script.*?src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+)"/g)];
    for (const [, scriptUrl] of scriptMatches) {
      try {
        const { data: js } = await axios.get(scriptUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          timeout: 10000,
        });
        const idMatch = js.match(/client_id:"([a-zA-Z0-9]{32})"/);
        if (idMatch) {
          cachedClientId = idMatch[1];
          cachedVersion = version;
          return idMatch[1];
        }
      } catch {}
    }
  } catch (e) {
    console.error("[SoundCloud] Failed to get client_id:", e.message);
  }
  return null;
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const sisa = sec % 60;
  return `${min}:${sisa.toString().padStart(2, "0")}`;
}

function formatNumber(n) {
  if (!n) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

async function scSearch(q, limit = 10) {
  const client_id = await getClientId();
  if (!client_id) throw new Error("Gagal mengambil client_id SoundCloud");

  const { data } = await axios.get("https://api-v2.soundcloud.com/search/tracks", {
    params: { q, client_id, limit },
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000,
  });

  return (data.collection || []).map((track) => ({
    id: track.id,
    title: track.title,
    url: track.permalink_url,
    author: track.user?.username || "Unknown",
    duration: formatDuration(track.duration),
    artwork: track.artwork_url || track.user?.avatar_url || null,
    plays: formatNumber(track.playback_count),
    likes: formatNumber(track.likes_count),
    genre: track.genre || "-",
  }));
}

async function scdl(url) {
  const client_id = await getClientId();
  if (!client_id) throw new Error("Gagal mengambil client_id SoundCloud");

  // Resolve URL ke track data
  const { data: track } = await axios.get("https://api-v2.soundcloud.com/resolve", {
    params: { url, client_id },
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000,
  });

  if (!track || !track.id) throw new Error("Track tidak ditemukan");

  // Cari progressive transcoding (direct MP3)
  const transcodings = track.media?.transcodings || [];
  const progressive = transcodings.find((t) => t.format?.protocol === "progressive");
  if (!progressive) throw new Error("Audio stream tidak tersedia untuk track ini");

  // Resolve stream URL
  const { data: streamData } = await axios.get(progressive.url, {
    params: { client_id },
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 15000,
  });

  if (!streamData?.url) throw new Error("Gagal mendapatkan URL download");

  return {
    title: track.title,
    uploader: track.user?.username || "Unknown",
    duration: formatDuration(track.duration),
    views: formatNumber(track.playback_count),
    likes: formatNumber(track.likes_count),
    thumbnail: track.artwork_url || track.user?.avatar_url || null,
    download_url: streamData.url,
    size: "~" + Math.round((track.duration / 1000) * 0.02 * 1000) / 1000 + " MB",
    format: "mp3",
  };
}

export default scdl;
export { scSearch, scdl, getClientId };
