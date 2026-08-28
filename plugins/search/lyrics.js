// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import te from '../../src/lib/nova-error.js'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

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
        return m.reply( `Hai kak! ✨ Lupa masukin judul lagunya ya? 😅\n\n` +
            `Coba deh ketik perintahnya begini: *${m.prefix}lirik sempurna andra and the backbone* 🎶\n\n` +
            `Yuk, masukin judulnya biar kita bisa nyanyi bareng! 🎤🔥`, "lirik")
    }
    
    m.react('🕐')
    
    try {
        const data = await fetchLyrics(query)
        
        if (!data || !data.lyrics || !data.lyrics.plain_lyrics) {
            return m.reply(claraWrap("Lirik", `Waduh, maaf banget kak 🥺 lirik lagu *${query}* nggak ketemu nih di database. Coba pakai kata kunci atau judul yang lebih spesifik ya! 💔`))
        }
        
        const title = data.title || query
        const artist = data.artist || data.lyrics.artist_name || 'Tidak diketahui'
        const lyricsText = data.lyrics.plain_lyrics
        
        const texts = `Ketemu nih liriknya! 🎉\n\n` +
                      `🎵 *ᴊᴜᴅᴜʟ:* ${title}\n` +
                      `🎤 *ᴀʀᴛɪꜱ:* ${artist}\n\n` +
                      `Ini dia lirik lengkapnya buat kamu:\n\n` +
                      `${lyricsText}\n\n` +
                      `Selamat bernyanyi ria, kak! 🎧💖`
                      
        if (data.thumbnail && data.thumbnail !== '-') {
            await sock.sendMessage(m.chat, {
                image: { url: data.thumbnail },
                caption: texts
            }, { quoted: m })
        } else {
            { const __navText = (texts); await m.reply(__navText); }
        }
        
        m.react('✅')
        
    } catch (error) {
        m.reply(novaError("Lyrics", "Server lirik lagi ngambek nih, coba lagi ya"))
    }
}

export { pluginConfig as config, handler }