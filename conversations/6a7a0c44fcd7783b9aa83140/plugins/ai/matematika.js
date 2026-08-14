import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from '../../src/lib/nova-error.js'
import axios from 'axios'
import config from '../../config.js'

const pluginConfig = {
    name: "matematika",
    alias: ["matematika", "math", "mathai"],
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
        return sendReplyWithNav(sock, m, claraWrap("ᴍᴀᴛʜ ɢᴘᴛ", `📐 *ᴍᴀᴛʜ ɢᴘᴛ*\n\n> Masukkan soal matematika\n\n\`Contoh: ${m.prefix}matematika 2+2 berapa?\``), "matematika")
    }

    m.react('🕐')

    try {
        const url = `https://api.nexray.eu.cc/ai/mathgpt?text=${encodeURIComponent(text)}`
        
        const { data } = await axios.get(url, {
            timeout: 30000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        })

        if (!data.status || !data.result) {
            return m.reply(claraWrap("matematika", "⚠️ Gagal memproses soal matematika."))
        }

        const answer = data.result

        m.react('✅')
        { const __navText = `${answer}`; await m.reply(__navText); }

    } catch (error) {
        m.reply(claraWrap("matematika", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }