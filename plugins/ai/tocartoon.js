// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, mediaCaption, toSC } from "../../src/lib/nova-menu-style.js";
import te from '../../src/lib/nova-error.js'
import { live3d } from '../../src/scraper/seaart.js'
const pluginConfig = {
    name: 'tocartoon',
    alias: ["tocartoon"],
    category: 'ai image',
    description: 'Ubah foto menjadi gaya kartun',
    usage: '.tocartoon (reply/kirim gambar)',
    example: '.tocartoon',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 3,
    isEnabled: true
}

const PROMPT = `Transform this image into a vibrant cartoon style like Disney or Pixar animation. 
Apply bold colors, smooth shading, exaggerated features, and that playful cartoon aesthetic. 
Keep the original composition but make it look like a frame from an animated movie with 
clean lines, expressive faces, and bright cheerful colors.`

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === 'imageMessage'))
    
    if (!isImage) {
        return m.reply(claraWrap("tocartoon", [
      "Kirim/reply gambar untuk diubah ke gaya kartun",
      "",
      `${m.prefix}tocartoon`,
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
            return m.reply(claraWrap("tocartoon", `❌ Gagal mendownload gambar`))
        }
        
        const result = await live3d(buffer, PROMPT)
        await sock.sendMedia(m.chat, result.image, null, m, {
            type: 'image'
        })
        
    } catch (error) {
        m.reply(claraWrap("tocartoon", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }