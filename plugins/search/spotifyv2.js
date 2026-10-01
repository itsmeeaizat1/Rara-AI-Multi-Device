// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// spotifyv2.js — Info track Spotify via spotify-url-info (parse URL)
import spotifyUrlInfo from 'spotify-url-info'
import { raraError, raraEmpty, raraNoInput, raraGuide } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
    name: "spotifyv2",
    alias: ["spotifyv2"],
    category: 'search',
    description: 'Info detail track Spotify dari URL (judul, artis, album, durasi)',
    usage: '.spotifyv2 <url spotify>',
    example: '.spotifyv2 https://open.spotify.com/track/xxxxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true,
}

async function handler(m, { sock }) {
    try {
        const url = (m.text || "").trim()

        if (!url || !url.includes("spotify.com")) {
            return m.reply(raraGuide('Spotify v2', 'Kirim link Spotify track yang mau kamu intip detailnya ya!', pluginConfig.example))
        }
        const spotify = spotifyUrlInfo("https://open.spotify.com")
        const data = await spotify.getData(url)

        if (!data) {
            return m.reply(raraEmpty('Spotify v2', 'Gak dapet info track-nya nih 🧐 Pastiin link Spotify valid ya!'))
        }

        const track = data.type === "track" ? data : (data.tracks?.items?.[0] || data)
        const name = track.name || "Unknown"
        const artists = Array.isArray(track.artists) ? track.artists.map(a => a.name).join(", ") : "Unknown"
        const album = track.album?.name || "Unknown"
        const duration = track.duration_ms ? Math.round(track.duration_ms / 1000) : 0
        const mins = Math.floor(duration / 60)
        const secs = duration % 60
        const durStr = mins + ":" + (secs < 10 ? "0" + secs : secs)
        const releaseDate = track.album?.release_date || "Unknown"
        const popularity = track.popularity ? track.popularity + "/100" : "N/A"
        const cover = track.album?.images?.[0]?.url

        let text =
            `*${name}*\n` +
            `by ${artists}\n\n` +
            `Album: ${album}\n` +
            `Rilis: ${releaseDate}\n` +
            `Durasi: ${durStr}\n` +
            `Popularitas: ${popularity}`

        if (track.external_urls?.spotify) {
            text += `\nURL: ${track.external_urls.spotify}`
        }

        // Kirim dengan thumbnail album jika ada
        if (cover) {
            try {
                await sock.sendMessage(m.chat, {
                    image: { url: cover },
                    caption: text
                }, { quoted: m })
                return
            } catch {
                // Fallback ke text saja
            }
        }
        return m.reply(text)
    } catch (e) {
        console.error("[spotifyv2] error:", e.message)
        return m.reply(raraError('Spotify v2', e.message))
    }
}

export { pluginConfig as config, handler }
