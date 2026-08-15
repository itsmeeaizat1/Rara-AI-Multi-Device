// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import config from '../../config.js'
const pluginConfig = {
    name: 'gita',
    alias: ['gitagpt', 'bhagavadgita'],
    category: 'ai',
    description: 'Chat dengan Gita GPT (Bhagavad Gita AI)',
    usage: '.gita <pertanyaan>',
    example: '.gita What is dharma?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')
    if (!text) {
        return sendReplyWithNav(sock, m, claraWrap("ɢɪᴛᴀ ɢᴘᴛ", `📿 *ɢɪᴛᴀ ɢᴘᴛ*\n\n> Masukkan pertanyaan\n\n\`Contoh: ${m.prefix}gita What is dharma?\``), "gita")
    }

    m.react('🕐')

    try {
        const url = `https://api.cuki.biz.id/api/ai/gita?apikey=${config.APIkey.cuki}&q=${encodeURIComponent(text)}`
        const data = await f(url)

        const content = data.results

        m.react('✅')
        { const __navText = `${content?.trim()}`; await m.reply(__navText); }

    } catch (error) {
        m.reply(claraWrap("gita", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }