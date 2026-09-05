// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: "setpp",
    alias: ["setpp"],
    category: 'tools',
    description: 'Mengubah foto profil bot',
    usage: '.setpp (reply gambar)',
    example: '.setpp',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    let buffer = null
    if (m.quoted?.isImage) {
        try {
            buffer = await m.quoted.download()
        } catch (e) {
            await m.reply(claraWrap("setpp", `❌ Gagal mengambil gambar.`))
            return
        }
    } else if (m.isImage) {
        try {
            buffer = await m.download()
        } catch (e) {
            await m.reply(claraWrap("setpp", `❌ Gagal mengambil gambar.`))
            return
        }
    }
    if (!buffer) {
        await m.reply(claraWrap("setpp", [
            `Ubah foto profil bot.`,
            ``,
            `📌 Format: ${m.prefix}setpp (reply gambar) atau kirim gambar + caption ${m.prefix}setpp`,
        ]))
        return
    }
    
    try {
    await m.react("🕒");
        const botJid = sock.user?.id
        if (!botJid) {
            { const __navText = claraWrap("setpp", `❌ Bot JID tidak ditemukan.`); await m.reply(__navText); }
            return
        }
        
        await sock.updateProfilePicture(botJid, buffer)
        
        await m.react("🐣");
        await m.reply(
            `✅ *ᴘᴘ ʙᴏᴛ ᴅɪᴜʙᴀʜ*\n\n` +
            `Foto profil bot berhasil diperbarui!`
        )
    } catch (error) {
    await m.react("❌");
        await m.reply(
            `❌ *ɢᴀɢᴀʟ*\n\n` +
            `Tidak dapat mengubah foto bot.\n` +
            `_${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }