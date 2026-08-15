// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'setnamegc',
    alias: ['setnamegrup', 'setgcname', 'setnamegroup', 'setnamagrup'],
    category: 'group',
    description: 'Mengubah nama grup',
    usage: '.setnamegc <nama baru>',
    example: '.setnamegc Grup Keren',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    isBotAdmin: true,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const newName = m.text?.trim()
    
    if (!newName) {
        await sendReplyWithNav(sock, m, `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}setnamegc Nama Grup Baru\``, "setnamegc")
        return
    }
    
    if (newName.length < 1 || newName.length > 100) {
        await m.reply(claraWrap("setnamegc", `⚠️ *ᴠᴀʟɪᴅᴀsɪ*\n\n` +
            `> Nama grup harus 1-100 karakter.`))
        return
    }
    
    try {
        await sock.groupUpdateSubject(m.chat, newName)
        
        await m.reply(claraWrap("Setnamegc", `✅ Berhasil mengubah nama grup menjadi *${newName}*`))
    } catch (error) {
        await m.reply(
            `❌ *ɢᴀɢᴀʟ*\n\n` +
            `> Tidak dapat mengubah nama grup.\n` +
            `> _${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }