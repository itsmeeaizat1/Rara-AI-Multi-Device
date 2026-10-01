// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import {  novaWrap, novaLine, novaCaption } from "../../src/lib/nova-menu-style.js";
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
    
    // FIX 19 Sep 2026: placeholder "@newsletter" pernah lolos jadi JID → resolve dulu
    const { resolveNewsletterJid } = await import("../../src/lib/nova-saluran.js")
    const channelId = await resolveNewsletterJid(sock).catch(() => '120363404849776664@newsletter')
    
    await m.reply(novaWrap("Ptvch", `🕕 *Mengirim Ptv Ke Channel...*`))
    
    try {
        await sock.sendMessage(channelId, {
            video: video,
            mimetype: 'video/mp4',
            gifPlayback: true,
            ptv: true
        })
        { const __navText = `✅ *sUkses*\n\nVideo berhasil dikirim ke channel sebagai PTV.`; return await m.reply(__navText); }
        
    } catch (err) {
        return m.reply(novaWrap("ptvch", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }