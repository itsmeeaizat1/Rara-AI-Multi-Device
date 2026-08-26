// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'setppgc',
    alias: ["setppgc"],
    category: 'group',
    description: 'Mengubah foto profil grup',
    usage: '.setppgc (reply gambar)',
    example: '.setppgc',
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
    let buffer = null
    if (m.quoted?.isImage) {
        try {
            buffer = await m.quoted.download()
        } catch (e) {
            await m.reply(claraWrap("setppgc", `❌ Gagal mengambil gambar.`))
            return
        }
    } else if (m.isImage) {
        try {
            buffer = await m.download()
        } catch (e) {
            await m.reply(claraWrap("setppgc", `❌ Gagal mengambil gambar.`))
            return
        }
    }
    if (!buffer) {
        await m.reply( `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `Reply gambar + \`${m.prefix}setppgc\`\n` +
            `Kirim gambar + caption \`${m.prefix}setppgc\``, "setppgc")
        return
    }
    try {
        await sock.updateProfilePicture(m.chat, buffer)
        await m.reply(claraWrap("Setppgc", `✅ Foto profil grup berhasil diperbarui!`))
    } catch (error) {
        await m.reply(
            `❌ Gagal mengubah foto grup.\n` +
            `_${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }