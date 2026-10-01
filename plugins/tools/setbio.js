// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
    name: 'setbio',
    alias: ["setbio"],
    category: 'tools',
    description: 'Mengubah bio/status bot',
    usage: '.setbio <bio baru>',
    example: '.setbio Bot WhatsApp by Lucky Archz',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const newBio = m.text?.trim()
    
    if (!newBio && m.args?.length === 0) {
        await m.reply(raraWrap("setbio", [
      `📌 Format: ${m.prefix}setbio <bio bot baru>`,
      `💡 Contoh: ${m.prefix}setbio Rara AI siap membantu`,
      `Hapus bio: ${m.prefix}setbio clear`
    ]))
        return
    }
    
    const bioToSet = newBio?.toLowerCase() === 'clear' ? '' : (newBio || '')
    
    if (bioToSet.length > 139) {
        await m.reply(raraWrap("setbio", `⚠️ *validasi*\n\n` +
            `Bio maksimal 139 karakter.`))
        return
    }
    
    try {
    await m.react("🕒");
        await sock.updateProfileStatus(bioToSet)
        
        if (bioToSet) {
            await m.reply(raraWrap("setbio", `✅ *bio bot diubah*\n\n` +
                `Bio bot sekarang:\n` +
                `_${bioToSet}_`))
        } else {
            await m.react("🐣");
            await m.reply(raraWrap("setbio", `✅ *bio bot dihapus*\n\n` +
                `Bio bot berhasil dihapus!`))
        }
    } catch (error) {
    await m.react("❌");
        await m.reply(
            `❌ *gagal*\n\n` +
            `Tidak dapat mengubah bio bot.\n` +
            `_${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }