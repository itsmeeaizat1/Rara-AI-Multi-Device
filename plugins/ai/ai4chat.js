// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { f } from '../../src/lib/nova-http.js'
import te from '../../src/lib/nova-error.js'
import axios from 'axios'
import config from '../../config.js'
const pluginConfig = {
    name: 'ai4chat',
    alias: ["ai4chat"],
    category: 'ai',
    description: 'Chat dengan AI4Chat',
    usage: '.ai4chat <pertanyaan>',
    example: '.ai4chat Apa itu JavaScript?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.text
    if (!text) {
        return m.reply(claraWrap("Aichat", `🤖 *ᴀɪᴄʜᴀᴛ*\n\nMasukkan pertanyaan\n\n\`Contoh: ${m.prefix}ai4chat Apa itu JavaScript?\``), "ai4chat")
    }
    try {
        const apiKey = config.APIkey?.ikyyxd || "kyzz";
        const response = await axios.get(`https://api.ikyyxd.my.id/ai/ai4chat/chat?apikey=${apiKey}&question=${encodeURIComponent(text)}`);
        if (response.data?.status && response.data?.result) {
          await m.reply(response.data.result);
        } else {
          // Fallback to gemini endpoint
          const geminiRes = await axios.get(`https://api.ikyyxd.my.id/ai/gemini?text=${encodeURIComponent(text)}&sessionsId=nova_ai4chat&apikey=${apiKey}`);
          await m.reply(geminiRes.data?.result || "AI tidak bisa menjawab saat ini.");
        }
    } catch (error) {
        console.log(error)
        m.reply(claraWrap("ai4chat", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }