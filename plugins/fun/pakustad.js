// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import config from "../../config.js";
const pluginConfig = {
    name: ['pakustad', 'pak-ustad', 'tanyaustad'],
    alias: ["pakustad", "pak-ustad", "tanyaustad"],
    category: 'fun',
    description: 'Tanya pak ustad (gambar)',
    usage: '.pakustad <pertanyaan>',
    example: '.pakustad kenapa aku ganteng',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text || m.quoted?.text
    
    if (!text) {
        return m.reply(claraWrap("pakustad", [
          `Tanya ustadz virtual, dijawab pakai logika lucu.`,
          ``,
          `📌 Format: ${m.prefix}pakustad <pertanyaan>`,
          `💡 Contoh: ${m.prefix}pakustad kenapa aku ganteng`,
        ]))
    }
    try {
    await m.react("🕒");
        const apiUrl = `https://api.cuki.biz.id/api/canvas/ustadz?apikey=${config.APIkey.cuki}&text=${encodeURIComponent(text)}`
        const { results } = await f(apiUrl)
        await sock.sendMedia(m.chat, results.url, text, m, {
            type: 'image'
        })
    } catch (err) {
    await m.react("❌");
        return m.reply(claraWrap("pakustad", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }