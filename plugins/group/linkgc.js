// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "linkgc",
    alias: ["linkgc", "linkgrup", "gclink"],
    category: 'group',
    description: 'Dapatkan link invite grup',
    usage: '.linkgc',
    example: '.linkgc',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
}

async function handler(m, { sock }) {
    m.react('🕐')
    
    try {
        const code = await sock.groupInviteCode(m.chat)
        const urlGrup = `https://chat.whatsapp.com/${code}`
        { const __navText = `Link grup grup ini\n${urlGrup}`; await m.reply(__navText); }
        
        m.react('✅')
        
    } catch (err) {
        m.reply(claraWrap("linkgc", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }