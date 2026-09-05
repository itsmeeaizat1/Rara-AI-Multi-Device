// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";
import { live3d } from '../../src/scraper/seaart.js'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'tooilpainting',
    alias: ["tooilpainting"],
    category: 'ai image',
    description: 'Ubah foto menjadi gaya lukisan minyak (oil painting)',
    usage: '.tooilpainting (reply/kirim gambar)',
    example: '.tooilpainting',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 3,
    isEnabled: true
}

const PROMPT = `Transform this image into a classical oil painting style. 
Apply thick brushstrokes, rich colors, and the texture of traditional oil paint on canvas. 
Keep the original composition but make it look like a masterpiece painting 
with visible brushwork, artistic color blending, and that timeless gallery-quality aesthetic.`

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === 'imageMessage'))
    
    if (!isImage) {
        return m.reply(claraWrap("tooilpainting", [
      "Kirim/reply gambar untuk diubah ke gaya lukisan minyak",
      "",
      `${m.prefix}tooilpainting`,
    ]))
    }
    try {
    await m.react("🕒");
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(claraWrap("tooilpainting", `❌ Gagal mendownload gambar`))
        }
        
        const result = await live3d(buffer, PROMPT)
        await sock.sendMedia(m.chat, result.image, null, m, {
            type: 'image',
        })
        
    } catch (error) {
        m.reply(claraWrap("tooilpainting", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }