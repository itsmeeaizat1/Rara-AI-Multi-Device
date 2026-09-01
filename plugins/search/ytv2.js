// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ytv2.js — YouTube search via Innertube API (youtubei.js, no API key)
import { Innertube } from 'youtubei.js'
import { novaError, novaEmpty, novaNoInput, novaGuide } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
    name: "ytv2",
    alias: ["ytv2"],
    category: 'search',
    description: 'Search YouTube via Innertube (tanpa API key, lebih cepat)',
    usage: '.ytv2 <query>',
    example: '.ytv2 lagu pop terbaru',
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
        const query = (m.text || "").trim()

        if (!query) {
            return m.reply(novaGuide('YouTube v2', 'Mau nyari video YouTube apa nih? Ketik judul atau kata kuncinya ya!', pluginConfig.example))
        }
        const yt = await Innertube.create()
        const search = await yt.search(query)

        const videos = search.videos
            .filter(v => v.type === "Video")
            .slice(0, 5)

        if (!videos.length) {
            return m.reply(novaEmpty('YouTube v2', `Gak nemu hasil buat "${query}" 🧐`))
        }

        let text = "╭─「 ✦ YouTube Search ✦ 」\n"
        text += "│ Query: " + query + "\n"
        text += "│\n"

        for (let i = 0; i < videos.length; i++) {
            const v = videos[i]
            const title = v.title?.text || v.title || "Unknown"
            const channel = v.author?.name || v.author?.text || "Unknown"
            const duration = v.duration?.text || v.length_text?.text || "?"
            const views = v.view_count?.text || v.short_view_count?.text || "?"
            const id = v.id || v.video_id || ""

            text += "" + (i + 1) + ". " + title + "\n"
            text += "" + channel + " | " + duration + " | " + views + "\n"
            if (id) text += "│ https://youtube.com/watch?v=" + id + "\n"
            if (i < videos.length - 1) text += "│\n"
        }

        text += "╰────  •  ────"

        // Kirim dengan thumbnail
        const thumb = videos[0]?.thumbnails?.[0]?.url || videos[0]?.thumbnail?.[0]?.url

        if (thumb) {
            try {
                await sock.sendMessage(m.chat, {
                    image: { url: thumb },
                    caption: text
                }, { quoted: m })
                return
            } catch {
                // Fallback ke text
            }
        }
        return m.reply(text)
    } catch (e) {
        console.error("[ytv2] error:", e.message)
        return m.reply(novaError('YouTube v2', e.message))
    }
}

export { pluginConfig as config, handler }
