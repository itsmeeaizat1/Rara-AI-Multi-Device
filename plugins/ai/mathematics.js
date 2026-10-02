// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraSalahV2 } from "../../src/lib/rara-menu-style.js";
import te from '../../src/lib/rara-error.js'
import axios from 'axios'
import config from '../../config.js'
import { callIkyy } from "../../src/lib/rara-ai-service.js";

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
        return m.reply(raraGuide("matematika", {
 kaomoji: "(•̀ᴗ•́)و",
 sapaan: "kirim soalnya, nanti aku bantu kerjain! (๑•̀ㅂ•́)و✧",
          cara: "ketik soal matematikanya sesudah command",
          contoh: `${m.prefix}matematika 2+2 berapa?`,
          spec: ["⚡ energi 1", "⏱ 10dtk", "💸 gratis"],
        }), "matematika")
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
            return m.reply(raraError("Matematika", "Gagal proses soal nih"))
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
      console.error("[mathematics.js] IkyyXD fallback failed:", ikyyErr.message);
    }

        m.reply(raraWrap("matematika", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }