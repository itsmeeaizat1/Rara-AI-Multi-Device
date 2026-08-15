// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "setname",
    alias: ["setname", "setname2", "setnamebot2"],
    category: 'tools',
    description: 'Mengubah nama profil bot',
    usage: '.setname <nama baru>',
    example: '.setname Nova-AI',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const newName = m.text?.trim()
    
    if (!newName) {
        await sendReplyWithNav(sock, m, `⚠️ *CARA PAKAI*\n\n` +
            `> \`${m.prefix}setname Nama Bot Baru\``, "setname")
        return
    }
    
    if (newName.length < 1 || newName.length > 25) {
        await m.reply(claraWrap("setname", `⚠️ *VALIDAsI*\n\n` +
            `> Nama bot harus 1-25 karakter.`))
        return
    }
    
    try {
        await sock.updateProfileName(newName)
        
        await m.reply(claraWrap("setname", `✅ *NAMA BOT DIUBAH*\n\n` +
            `> Nama bot sekarang: *${newName}*`))
    } catch (error) {
        await m.reply(
            `❌ *GAGAL*\n\n` +
            `> Tidak dapat mengubah nama bot.\n` +
            `> _${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }