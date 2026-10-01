// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from '../../src/lib/nova-error.js'
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'resetlinkgc',
    alias: ["resetlinkgc"],
    category: 'group',
    description: 'Reset link invite grup',
    usage: '.resetlinkgc',
    example: '.resetlinkgc',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
}

async function handler(m, { sock }) {
    try {
        await sock.groupRevokeInvite(m.chat)
        { const __navText = `✅ *link grup direset*\nLink grup lama sudah tidak berlaku.\nGunakan \`${m.prefix}linkgc\` untuk mendapatkan link baru.`; await m.reply(__navText); }
        
    } catch (err) {
        m.reply(claraWrap("resetlinkgc", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }