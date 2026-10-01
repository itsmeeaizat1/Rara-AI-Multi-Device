// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap, novaGuideV2, novaSalahV2 } from "../../src/lib/nova-menu-style.js";
import axios from 'axios'
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import config from '../../config.js'
const pluginConfig = {
    name: 'gita',
    alias: ["gita"],
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
        return m.reply(novaGuideV2("gita", {
 kaomoji: "(๑ᵔ⤙ᵔ๑)",
 sapaan: "nanya apa aja ke Gita GPT, asisten AI serba bisa! (◕ᴗ◕)",
          cara: "ketik pertanyaannya sesudah command",
          contoh: `${m.prefix}gita What is dharma?`,
          spec: ["⚡ energi 1", "⏱ 5dtk", "💸 gratis"],
        }), "gita")
    }
    try {
    await m.react("🕒");
        const url = `https://api.cuki.biz.id/api/ai/gita?apikey=${config.APIkey.cuki}&q=${encodeURIComponent(text)}`
        const data = await f(url)

        const content = data.results
        await m.react("🐣");
        { const __navText = `${content?.trim()}`; await m.reply(__navText); }

    } catch (error) {
        m.reply(novaWrap("gita", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }