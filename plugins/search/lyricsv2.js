// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// lyricsv2.js — Cari lirik lagu via Genius (genius-lyrics) + nexray fallback
import { Client as GeniusClient } from 'genius-lyrics'
import axios from 'axios'
import config from '../../config.js'
import { raraError, raraEmpty, raraNoInput, raraGuide } from '../../src/lib/rara-menu-style.js'
import { enrichLyricsMeta, lyricsCaption } from "../../src/lib/rara-lyrics-format.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// kartu info media (batch download) - helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


const pluginConfig = {
    name: "lirikv2",
    alias: ["lirikv2"],
    category: 'search',
    description: 'Cari lirik lagu (Genius API + fallback nexray, no key)',
    usage: '.lirikv2 <judul lagu>',
    example: '.lirikv2 sempurna andra',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true,
}

async function fetchGenius(query) {
    const key = config.APIkey?.genius || config.geniusKey || ""
    if (!key) return null

    const client = new GeniusClient(key)
    const results = await client.songs.search(query)
    if (!results.length) return null

    const song = results[0]
    const lyrics = await song.lyrics()
    return {
        title: song.title,
        artist: song.artist?.name || "Unknown",
        thumbnail: song.thumbnail || "",
        lyrics,
    }
}

async function fetchNexray(query) {
    const { data } = await axios.get(
        'https://api.nexray.eu.cc/search/lyrics?q=' + encodeURIComponent(query),
        { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!data?.status || !data?.result) return null
    const r = data.result
    const lyrics = typeof r.lyrics === 'string' ? r.lyrics :
        (r.lyrics?.lines?.map(l => l.text || l).join('\n') || r.lyrics?.text || JSON.stringify(r.lyrics))
    return {
        title: r.title || "Unknown",
        artist: r.artist || "Unknown",
        thumbnail: r.thumbnail || "",
        lyrics: lyrics || "Lirik tidak tersedia",
    }
}

async function handler(m, { sock }) {
    try {
        const query = (m.text || "").trim()

        if (!query) {
            return m.reply(raraGuide('Lirik v2', 'Mau nyari lirik lagu? Ketik judulnya ya!', pluginConfig.example))
        }
        let result = null
        let source = ""

        // Try Genius first (if API key available)
        try {
            result = await fetchGenius(query)
            if (result) source = "Genius"
        } catch (e) {
            console.log("[lirikv2] Genius failed:", e.message)
        }

        // Fallback to nexray
        if (!result) {
            try {
                result = await fetchNexray(query)
                if (result) source = "nexray"
            } catch (e) {
                console.log("[lirikv2] nexray failed:", e.message)
            }
        }

        if (!result) {
            return m.reply(raraEmpty('Lirik v2', `Gak nemu lagu "${query}" 🧐`))
        }

        // Format lyrics
        let lyrics = result.lyrics || "Lirik tidak tersedia"
        if (lyrics.length > 3500) {
            lyrics = lyrics.slice(0, 3500) + "\n\n... (lirik dipotong)"
        }

        // format owner 19 Sep: judul/artis/album/durasi → lirik
        const meta = await enrichLyricsMeta(result.title, result.artist)
        const text = lyricsCaption({
            title: result.title, artist: result.artist,
            album: meta?.album, duration: meta?.duration,
            lyrics,
        })

        // Kirim dengan thumbnail jika ada
        if (result.thumbnail) {
            try {
                await sock.sendMessage(m.chat, {
                    image: { url: result.thumbnail },
                    caption: ((await dlCard("gambar", { url: result.thumbnail }, [["Judul", String(result.title || query).slice(0, 40)], ["Penyanyi", String(result.artist || "-").slice(0, 40)]])) || text)
                }, { quoted: m })
                return
            } catch {
                // Fallback ke text
            }
        }
        return m.reply(text)
    } catch (e) {
        console.error("[lirikv2] error:", e.message)
        return m.reply(raraError('Lirik v2', e.message))
    }
}

export { pluginConfig as config, handler }
