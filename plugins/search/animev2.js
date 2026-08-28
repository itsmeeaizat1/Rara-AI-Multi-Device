// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { novaError, novaEmpty, novaNoInput, novaGuide } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
    name: "animev2",
    alias: ["animev2"],
    category: 'search',
    description: 'Search anime dari MyAnimeList (Jikan API)',
    usage: '.animev2 <nama anime>',
    example: '.animev2 naruto',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        const query = m.text?.trim() || m.args?.join(" ")?.trim() || ""

        if (!query) {
            return m.reply(novaGuide('Anime Search', 'Mau nyari anime apa nih? Ketik nama animenya ya!', pluginConfig.example))
        }

        if (m.react) await m.react("🕒")

        const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        const animeList = response.data?.data || []

        if (!animeList || animeList.length === 0) {
            if (m.react) await m.react("🐣")
            return m.reply(novaEmpty('Anime Search', `Gak nemu anime "${query}" 🧐`))
        }

        const top5 = animeList.slice(0, 5)

        let listText = "╭──「 Anime Search 」\n"
        top5.forEach((item, index) => {
            const title = item.title || item.title_english || item.title_japanese || 'Unknown'
            const year = item.year || item.aired?.prop?.from?.year || 'N/A'
            const score = item.score ? item.score : 'N/A'
            const episodes = item.episodes ? item.episodes : '?'
            const status = item.status || 'N/A'
            let synopsis = item.synopsis ? item.synopsis.replace(/\r?\n|\r/g, ' ').trim() : 'Tidak ada sinopsis.'
            if (synopsis.length > 100) {
                synopsis = synopsis.slice(0, 100) + '...'
            }

            listText += `│ ${index + 1}. ${title} (${year})\n`
            listText += `│ ⭐ ${score} | ${episodes} eps | ${status}\n`
            listText += `│ ${synopsis}\n`
            if (index < top5.length - 1) {
                listText += `│\n`
            }
        })
        listText += "╰──────────❀"

        if (m.react) await m.react("🐣")

        const imageUrl = top5[0]?.images?.jpg?.image_url || top5[0]?.images?.jpg?.large_image_url || null

        if (imageUrl) {
            if (sock && typeof sock.sendMedia === 'function') {
                try {
                    await sock.sendMedia(m.chat, imageUrl, listText, m, { type: 'image' })
                    return
                } catch (e) {
                    console.error('[animev2] sock.sendMedia error:', e?.message || e)
                }
            }

            if (sock && typeof sock.sendMessage === 'function') {
                try {
                    await sock.sendMessage(m.chat, {
                        image: { url: imageUrl },
                        caption: listText
                    }, { quoted: m })
                    return
                } catch (e) {
                    console.error('[animev2] sock.sendMessage error:', e?.message || e)
                }
            }
        }

        return m.reply(listText)

    } catch (error) {
        console.error("[animev2] error:", error?.message || error)
        if (m.react) await m.react("🐣")
        const errorMsg = error.response?.data?.message || error.message || 'Unknown error'
        return m.reply(novaError('Anime Search', errorMsg))
    }
}

export { pluginConfig as config, handler }
