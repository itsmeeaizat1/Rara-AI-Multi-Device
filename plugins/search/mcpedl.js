// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'

const pluginConfig = {
    name: 'mcpedl',
    alias: ["mcpedl", "mcpe"],
    category: 'search',
    description: 'Cari map dan addon Minecraft PE dari MCPEDL',
    usage: '.mcpe <query>',
    example: '.mcpe survival',
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

async function fetchMcpe(query) {
    const { data } = await axios.get(`https://api.cuki.biz.id/api/search/mcpe?apikey=${encodeURIComponent(CUKI_APIKEY)}&query=${encodeURIComponent(query)}`, {
        timeout: 30000,
        headers: {
            'x-api-key': CUKI_APIKEY,
            'user-agent': 'Mozilla/5.0'
        }
    })

    if (!data?.status || !Array.isArray(data?.data?.results)) {
        throw new Error(data?.message || 'Hasil MCPEDL tidak ditemukan')
    }

    return data.data
}

async function handler(m, { sock }) {
    const query = m.text?.trim()

    if (!query) {
        { const __navText = `🧱 *mcpedl search*\n\nContoh:\n\`${m.prefix}mcpe survival\``; return await m.reply( __navText, "mcpedl"); }
    }
    try {
        const result = await fetchMcpe(query)
        const items = result.results.slice(0, 10)

        if (items.length === 0) {
            return m.reply(raraError("MCPEDL", `Gak nemu hasil untuk: ${query} nih`))
        }

        let caption = '🧱 *mcpedl search*\n\n'
        caption += `🔎 *query:* ${result.query || query}\n`
        caption += `📦 *total:* ${result.total || items.length}\n`
        caption += `🌐 *source:* ${result.source || 'mcpedl.org'}\n\n`

        items.forEach((item, index) => {
            caption += `*${index + 1}.* ${trimText(item.title)}\n`
            caption += `   ├ ⭐ Rating: ${item.rating || '-'}\n`
            caption += `   ├ ${item.link}\n\n`
        })

        const cover = items[0]?.image
        if (cover) {
            await sock.sendMedia(m.chat, cover, caption.trim(), m, {
                type: 'image'
            })
        } else {
            await m.reply(caption.trim())
        }
    } catch (error) {
        console.log(error)
        m.reply(raraWrap("mcpedl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
