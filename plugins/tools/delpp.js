// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'delpp',
    alias: ["delpp"],
    category: 'tools',
    description: 'Menghapus foto profil bot',
    usage: '.delpp',
    example: '.delpp',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
    await m.react("🕒");
        const botJid = sock.user?.id
        if (!botJid) {
            { const __navText = claraWrap("delpp", `❌ Bot JID tidak ditemukan.`); await m.reply(__navText); }
            return
        }
        
        await sock.removeProfilePicture(botJid)
        
        await m.react("🐣");
        await m.reply(
            `✅ *pp bot dihapus*\n\n` +
            `Foto profil bot berhasil dihapus!`
        )
    } catch (error) {
    await m.react("❌");
        await m.reply(
            `❌ *gagal*\n\n` +
            `Tidak dapat menghapus foto bot.\n` +
            `_${error.message}_`
        )
    }
}

export { pluginConfig as config, handler }