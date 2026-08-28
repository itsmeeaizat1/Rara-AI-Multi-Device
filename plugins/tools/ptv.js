// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'ptv',
    alias: ["ptv"],
    category: 'tools',
    description: 'Kirim video sebagai PTV (circle video)',
    usage: '.ptv (reply video)',
    example: '.ptv',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    let video = null
    
    if (m.quoted && m.quoted.isVideo) {
        try {
            video = await m.quoted.download()
        } catch (e) {
            return m.reply(claraWrap("ptv", `❌ Gagal download video dari quoted.`))
        }
    } else if (m.isVideo) {
        try {
            video = await m.download()
        } catch (e) {
            return m.reply(claraWrap("ptv", `❌ Gagal download video.`))
        }
    }
    
    if (!video) {
        return m.reply( `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `Kirim *ᴠɪᴅᴇᴏ* atau *ʙᴀʟᴀꜱ ᴠɪᴅᴇᴏ* lalu ketik:\n` +
            `\`${m.prefix}ptv\``, "ptv")
    }
    
    { const __navText = `🕕 *ᴍᴇᴍʙᴜᴀᴛ ᴘᴛᴠ...*`; await m.reply(__navText); }
    
    try {
        await sock.sendMessage(m.chat, {
            video: video,
            mimetype: 'video/mp4',
            gifPlayback: true,
            ptv: true
        }, { quoted: m })
        
        m.react('✅')
        
    } catch (err) {
        return m.reply(claraWrap("ptv", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }