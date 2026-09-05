// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "setname",
    alias: ["setname"],
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
        await m.reply(claraWrap("setname", [
            `Ubah nama profil bot.`,
            ``,
            `📌 Format: ${m.prefix}setname <nama bot baru>`,
            `💡 Contoh: ${m.prefix}setname Nova AI`,
        ]))
        return
    }
    
    if (newName.length < 1 || newName.length > 25) {
        await m.reply(claraWrap("setname", `⚠️ *ᴠᴀʟɪᴅᴀꜱɪ*\n\n` +
            `Nama bot harus 1-25 karakter.`))
        return
    }
    
    try {
    await m.react("🕒");
        await sock.updateProfileName(newName)
        
        await m.react("🐣");
        await m.reply(claraWrap("setname", `✅ *ɴᴀᴍᴀ ʙᴏᴛ ᴅɪᴜʙᴀʜ*\n\n` +
            `Nama bot sekarang: *${newName}*`))
    } catch (error) {
    await m.react("❌");
        await m.reply(
            `❌ *ɢᴀɢᴀʟ*\n\n` +
            `Tidak dapat mengubah nama bot.\n` +
            `_${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }