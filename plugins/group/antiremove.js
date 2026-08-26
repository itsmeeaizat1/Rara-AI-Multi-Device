// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "antiremove",
    alias: ["antiremove"],
    category: 'group',
    description: 'Mengaktifkan/menonaktifkan anti hapus pesan di grup',
    usage: '.antiremove <on/off>',
    example: '.antiremove on',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 3,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: false
}

async function handler(m, { sock, db }) {
    const action = (m.args || [])[0]?.toLowerCase()
    const group = db.getGroup(m.chat) || {}

    if (!action) {
        const status = group.antiremove || 'off'
        await m.reply( `🗑️ *ᴀɴᴛɪʀᴇᴍᴏᴠᴇ*\n\n` +
            `Status: *${status === 'on' ? '✅ Aktif' : '❌ Nonaktif'}*\n\n` +
            `\`.antiremove on/off\``, "antiremove")
        return
    }

    if (action === 'on') {
        db.setGroup(m.chat, { ...group, antiremove: 'on' })
        m.react('✅')
        { const __navText = `✅ *ᴀɴᴛɪʀᴇᴍᴏᴠᴇ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ*\nPesan yang dihapus akan di-forward ulang.`; await m.reply(__navText); }
        return
    }

    if (action === 'off') {
        db.setGroup(m.chat, { ...group, antiremove: 'off' })
        await m.reply(claraWrap("Antiremove", `❌ *ᴀɴᴛɪʀᴇᴍᴏᴠᴇ ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ*`))
        return
    }

    await m.reply(`❌ Gunakan \`.antiremove on\` atau \`.antiremove off\``)
}

export { pluginConfig as config, handler }