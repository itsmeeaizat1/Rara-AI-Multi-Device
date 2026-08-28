// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap, claraLine, novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";

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
            await m.reply(novaError('SetPPGC', 'Duh, gagal mengambil gambar dari pesan yang kamu reply nih.'))
            return
        }
    } else if (m.isImage) {
        try {
            buffer = await m.download()
        } catch (e) {
            await m.reply(novaError('SetPPGC', 'Duh, gagal mengambil gambar yang kamu kirim nih.'))
            return
        }
    }
    if (!buffer) {
        await m.reply(novaGuide('SetPPGC', 'Kirim atau reply gambar yang ingin dijadikan foto profil grup baru!', `${m.prefix}setppgc`))
        return
    }
    try {
        await sock.updateProfilePicture(m.chat, buffer)
        await m.reply(claraWrap("Setppgc", `✅ Foto profil grup berhasil diperbarui!`))
    } catch (error) {
        await m.reply(novaError('SetPPGC', `Gagal mengubah foto profil grup: ${error.message}`))
    }
}

export { pluginConfig as config, handler }
