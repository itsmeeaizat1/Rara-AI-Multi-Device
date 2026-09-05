// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import te from '../../src/lib/nova-error.js'
import axios from 'axios'
import config from '../../config.js'
import { callIkyy } from "../../src/lib/nova-ai-service.js";

const pluginConfig = {
    name: "matematika",
    alias: ["matematika"],
    category: 'ai',
    description: 'AI untuk menyelesaikan soal matematika',
    usage: '.matematika <soal>',
    example: '.matematika 2+2 berapa?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')

    if (!text) {
        return m.reply(claraWrap("Math Gpt", `Masukkan soal matematika\n\n\`Contoh: ${m.prefix}matematika 2+2 berapa?\``), "matematika")
    }
    try {
    await m.react("🕒");
        const url = `https://api.nexray.eu.cc/ai/mathgpt?text=${encodeURIComponent(text)}`
        
        const { data } = await axios.get(url, {
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        })

        if (!data.status || !data.result) {
            return m.reply(novaError("Matematika", "Gagal proses soal nih"))
        }

        const answer = data.result
        { const __navText = `${answer}`; await m.reply(__navText); }

    } catch (error) {
    // IkyyXD fallback
    try {
      const ikyyReply = await callIkyy(text?.trim() || m.text, {});
      await m.react("🐣");
      if (ikyyReply) return m.reply(ikyyReply);
    } catch (ikyyErr) {
      console.error("[matematika.js] IkyyXD fallback failed:", ikyyErr.message);
    }

        m.reply(claraWrap("matematika", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }