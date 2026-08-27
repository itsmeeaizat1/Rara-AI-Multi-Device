// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import {  claraWrap, claraLine, novaCaption } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'ptvch',
    alias: ["ptvch"],
    category: 'owner',
    description: 'Kirim video sebagai PTV ke channel',
    usage: '.ptvch (reply video)',
    example: '.ptvch',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    let video = null
    
    if (m.quoted && m.quoted.isVideo) {
        try {
            video = await m.quoted.download()
        } catch (e) {
            return m.reply(novaCaption({
  emoji: "📺",
  name: "ptvch",
  description: "Kirim video sebagai PTV ke channel",
  usage: `${m.prefix}ptvch (reply video)`,
  example: `${m.prefix}ptvch`,
}), "ptvch");
        }
    }
    
    const channelId = config.saluran?.id || '120363404849776664@newsletter'
    
    await m.reply(claraWrap("Ptvch", `🕕 *Mengirim Ptv Ke Channel...*`))
    
    try {
        await sock.sendMessage(channelId, {
            video: video,
            mimetype: 'video/mp4',
            gifPlayback: true,
            ptv: true
        })
        
        await m.react('✅')
        { const __navText = `✅ *sUkses*\n\nVideo berhasil dikirim ke channel sebagai PTV.`; return await m.reply(__navText); }
        
    } catch (err) {
        return m.reply(claraWrap("ptvch", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }