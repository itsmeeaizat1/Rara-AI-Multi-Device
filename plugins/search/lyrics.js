// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// lyrics.js — .lirik: primary nexray → FALLBACK Genius no-key (engine .lirik2,
// request owner 2026-09-06: "klo .lirik g bsa fallback ke .lirik2")
import axios from 'axios'
import te from '../../src/lib/nova-error.js'
import { searchSongLyrics } from '../../src/scraper/genius-lyrics.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { lyricsCaption, enrichLyricsMeta } from "../../src/lib/nova-lyrics-format.js";

async function fetchLyrics(judul) {
  try {
    const res = await axios.get(`https://api.nexray.eu.cc/search/lyrics?q=${encodeURIComponent(judul)}`)
    if (res.data && res.data.status && res.data.result) {
      return res.data.result
    }
    return null
  } catch (error) {
    return null
  }
}

const pluginConfig = {
    name: 'lirik',
    alias: ["lirik"],
    category: 'search',
    description: 'Cari lirik lagu',
    usage: '.lirik <query>',
    example: '.lirik sempurna',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const query = m.text?.trim()
    
    if (!query) {
        return m.reply( `Hai kak! Lupa masukin judul lagunya ya? 😅\n\n` +
            `Coba deh ketik perintahnya begini: *${m.prefix}lirik sempurna andra and the backbone* 🎶\n\n` +
            `Yuk, masukin judulnya biar kita bisa nyanyi bareng! 🎤🔥`, "lirik")
    }
    try {
        let data = await fetchLyrics(query)

        // FALLBACK: nexray gagal/kosong → Genius no-key (engine .lirik2)
        if (!data || !data.lyrics || !data.lyrics.plain_lyrics) {
            console.log("[lirik] nexray gagal, fallback ke Genius (engine lirik2)...")
            try {
                const genius = await searchSongLyrics(query)
                if (genius?.status && genius?.data?.lyrics) {
                    const g = genius.data
                    const lyricsText2 = g.lyrics.length > 3500
                        ? g.lyrics.slice(0, 3500) + "\n\n... (lirik dipotong, lengkapnya di " + g.url + ")"
                        : g.lyrics
                    // format owner 19 Sep: judul/artis/album/durasi → lirik
                    const meta2 = await enrichLyricsMeta(g.title, g.artist);
                    const caption2 =
                        lyricsCaption({
                            title: g.title, artist: g.artist,
                            album: meta2?.album, duration: meta2?.duration,
                            lyrics: lyricsText2,
                        }) + `\n\nSource: Genius`
                    await m.react("🐣")
                    if (g.thumbnail) {
                        try {
                            await sock.sendMessage(m.chat, {
                                image: { url: g.thumbnail },
                                caption: caption2
                            }, { quoted: m })
                            return
                        } catch {}
                    }
                    return m.reply(caption2)
                }
            } catch (fbErr) {
                console.log("[lirik] fallback Genius juga gagal:", fbErr.message)
            }
            return m.reply(claraWrap("Lirik", `Waduh, maaf banget kak 🥺 lirik lagu *${query}* nggak ketemu nih di database. Coba pakai kata kunci atau judul yang lebih spesifik ya! 💔`))
        }
        
        const title = data.title || query
        const artist = data.artist || data.lyrics.artist_name || 'Tidak diketahui'
        const lyricsText = data.lyrics.plain_lyrics

        // format owner 19 Sep: judul/artis/album/durasi → lirik
        // (nexray gak punya album/durasi → enrich dari LRCLIB, gagal senyap)
        const meta = await enrichLyricsMeta(title, artist)
        const texts = lyricsCaption({
            title, artist,
            album: meta?.album, duration: meta?.duration,
            lyrics: lyricsText,
        })
                      
        if (data.thumbnail && data.thumbnail !== '-') {
            await sock.sendMessage(m.chat, {
                image: { url: data.thumbnail },
                caption: texts
            }, { quoted: m })
        } else {
            { const __navText = (texts); await m.reply(__navText); }
        }
    } catch (error) {
        m.reply(novaError("Lyrics", "Server lirik lagi ngambek nih, coba lagi ya"))
    }
}

export { pluginConfig as config, handler }