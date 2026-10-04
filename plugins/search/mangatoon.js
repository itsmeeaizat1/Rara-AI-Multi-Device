// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";
// kartu info media (batch search) - helper ringkas, best-effort tak pernah ganggu kirim
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
    name: 'mangatoon',
    alias: ["mangatoon"],
    category: 'search',
    description: 'Cari komik di Mangatoon',
    usage: '.mangatoon <query>',
    example: '.mangatoon love',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 8,
    energi: 1,
    isEnabled: true
}

const CUKI_APIKEY = config.APIkey?.cuki || 'cuki-x'

function trimText(text, max = 60) {
    const value = (text || '').replace(/\s+/g, ' ').trim()
    if (!value) return '-'
    if (value.length <= max) return value
    return value.slice(0, max) + '...'
}

async function fetchMangatoon(query) {
    const { data } = await axios.get(`https://api.cuki.biz.id/api/search/mangatoon?apikey=${encodeURIComponent(CUKI_APIKEY)}&query=${encodeURIComponent(query)}`, {
        timeout: 30000,
        headers: {
            'x-api-key': CUKI_APIKEY,
            'user-agent': 'Mozilla/5.0'
        }
    })

    if (!data?.status || !data?.data?.results) {
        throw new Error(data?.message || 'Hasil Mangatoon tidak ditemukan')
    }

    return data.data
}

async function handler(m, { sock }) {
    const query = m.text?.trim()

    if (!query) {
        { const __navText = `📚 *mangatoon search*\n\nContoh:\n\`${m.prefix}mangatoon love\``; return await m.reply( __navText, "mangatoon"); }
    }
    try {
        const result = await fetchMangatoon(query)
        const komikGroups = Array.isArray(result.results?.komik) ? result.results.komik : []
        const items = komikGroups.flatMap((entry) => Array.isArray(entry?.items) ? entry.items : []).slice(0, 10)

        if (items.length === 0) {
            return m.reply(raraError("Mangatoon", `Gak nemu komik untuk: ${query} nih`))
        }

        let caption = '📚 *mangatoon search*\n\n'
        caption += `🔎 *query:* ${result.query || query}\n`
        caption += `📦 *total:* ${result.total || items.length}\n`
        caption += `🌐 *source:* ${result.source || 'mangatoon.mobi'}\n\n`

        items.forEach((item, index) => {
            caption += `*${index + 1}.* ${trimText(item.title)}\n`
            caption += `   ├ ${item.link}\n\n`
        })

        const cover = items[0]?.image
        if (cover) {
            const card = await dlCard("gambar", { url: cover }, [["Query", String(query).slice(0, 40)], ["Total", String(result.total || items.length)]]);
            await sock.sendMedia(m.chat, cover, card ? `${card}\n\n${caption.trim()}` : caption.trim(), m, {
                type: 'image'
            })
        } else {
            await m.reply(caption.trim())
        }
    } catch (error) {
        console.log(error)
        m.reply(raraWrap("mangatoon", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
