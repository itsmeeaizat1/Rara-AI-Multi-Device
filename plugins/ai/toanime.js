import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from '../../src/lib/nova-error.js'
import { live3d } from '../../src/scraper/seaart.js'
const pluginConfig = {
    name: "toanime",
    alias: ["toanime", "animeconvert", "ghibli2"],
    category: 'ai',
    description: 'Ubah foto menjadi gaya anime/Ghibli Studio',
    usage: '.toanime (reply/kirim gambar)',
    example: '.toanime',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 3,
    isEnabled: true
}

const PROMPT = `Transform this image into Studio Ghibli anime style. 
Make the characters look like they belong in a Ghibli movie with soft colors, 
detailed backgrounds, expressive eyes, and that signature warm, magical atmosphere. 
Keep the original composition but apply the distinct Ghibli artistic style with 
watercolor-like textures and dreamy lighting.`

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && (m.quoted.isImage || m.quoted.type === 'imageMessage'))
    
    if (!isImage) {
        return sendReplyWithNav(sock, m, `🎨 *ᴛᴏ ᴀɴɪᴍᴇ*\n\n` +
            `> Kirim/reply gambar untuk diubah ke gaya anime\n\n` +
            `\`${m.prefix}toanime\``, "toanime")
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(claraWrap("toanime", `❌ Gagal mendownload gambar`))
        }
        
        await m.react('🕐')
        
        const result = await live3d(buffer, PROMPT)
        
        m.react('✅')
        
        await sock.sendMedia(m.chat, result.image, null, m, {
            type: 'image'
        })
        
    } catch (error) {
        console.log(error)
        m.reply(claraWrap("toanime", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }